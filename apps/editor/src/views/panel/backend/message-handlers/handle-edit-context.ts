import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ModelProvider
} from '@/services/model-providers-manager'
import axios from 'axios'
import {
  API_EDIT_FORMAT_STATE_KEY,
  RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
} from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { ApiConfiguration } from '@/services/model-providers-manager'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { EditContextMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'
import { split_recent_and_rest_configurations } from '@/views/panel/backend/utils/split-recent-and-rest-configurations'
import { t } from '@/i18n'

const get_edit_context_api_configuration = async (params: {
  api_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
  panel_provider: PanelProvider
  api_configuration_id?: string
}): Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined> => {
  const edit_context_api_configurations =
    await params.api_providers_manager.get_api_configurations()

  if (edit_context_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_EDIT_CONTEXT_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      edit_context_api_configurations.find(
        (c) => get_api_configuration_id(c) == params.api_configuration_id
      ) || null
    if (selected_api_configuration) {
      let recents =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
        ) || []
      recents = [
        params.api_configuration_id,
        ...recents.filter((id) => id != params.api_configuration_id)
      ]
      params.context.workspaceState.update(
        RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY,
        recents
      )

      if (params.panel_provider) {
        params.panel_provider.send_message({
          command: 'SELECTED_API_CONFIGURATION_CHANGED',
          prompt_type: 'edit-context',
          id: params.api_configuration_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    const recents = params.context.workspaceState.get<string[]>(
      RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]

    if (last_selected_id) {
      selected_api_configuration =
        edit_context_api_configurations.find(
          (c) => get_api_configuration_id(c) == last_selected_id
        ) || null
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    type Item = vscode.QuickPickItem & {
      api_configuration?: ApiConfiguration
      id?: string
    }
    const create_items = async (): Promise<Item[]> => {
      const recent_ids =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
        ) || []

      const { recent: recent_api_configurations, rest: other_api_configurations } =
        split_recent_and_rest_configurations(
          edit_context_api_configurations,
          recent_ids,
          get_api_configuration_id
        )

      const map_api_configuration_to_item = (api_configuration: ApiConfiguration) => {
        const description_parts = [api_configuration.model_provider_name]
        if (api_configuration.temperature != null) {
          description_parts.push(`${api_configuration.temperature}`)
        }
        if (api_configuration.reasoning_effort) {
          description_parts.push(`${api_configuration.reasoning_effort}`)
        }

        const buttons: vscode.QuickInputButton[] = []

        return {
          label: api_configuration.model,
          description: description_parts.join(' · '),
          buttons,
          api_configuration,
          id: get_api_configuration_id(api_configuration)
        }
      }

      const items: Item[] = []

      if (recent_api_configurations.length > 0) {
        items.push({
          label: t('common.separator.recently-used'),
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...recent_api_configurations.map(map_api_configuration_to_item))
      }

      if (other_api_configurations.length > 0) {
        if (recent_api_configurations.length > 0) {
          items.push({
            label: t('common.config.other'),
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...other_api_configurations.map(map_api_configuration_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick<Item>()
    quick_pick.items = await create_items()
    quick_pick.title = t('common.config.title')
    quick_pick.placeholder = 'Select a configuration'
    quick_pick.matchOnDescription = true
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }
    ]

    const recents = params.context.workspaceState.get<string[]>(
      RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]
    const items = quick_pick.items
    const last_selected_item = items.find((item) => item.id == last_selected_id)

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    } else if (items.length > 0) {
      const first_selectable = items.find(
        (i) => i.kind != vscode.QuickPickItemKind.Separator
      )
      if (first_selectable) {
        quick_pick.activeItems = [first_selectable]
      }
    }

    return new Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined>(
      (resolve) => {
        let accepted = false

        quick_pick.onDidTriggerButton((button) => {
          if (button.tooltip == t('common.close')) {
            resolve(undefined)
            quick_pick.hide()
          }
        })

        quick_pick.onDidAccept(async () => {
          accepted = true
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()

          if (!selected || !selected.api_configuration) {
            resolve(undefined)
            return
          }

          let recents =
            params.context.workspaceState.get<string[]>(
              RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY
            ) || []
          recents = [
            selected.id!,
            ...recents.filter((id) => id !== selected.id)
          ]
          params.context.workspaceState.update(
            RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY,
            recents
          )

          if (params.panel_provider) {
            params.panel_provider.send_message({
              command: 'SELECTED_API_CONFIGURATION_CHANGED',
              prompt_type: 'edit-context',
              id: selected.id!
            })
          }

          const model_provider = await params.api_providers_manager.get_model_provider(
            selected.api_configuration.model_provider_name
          )
          if (!model_provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_NOT_FOUND
            )
            resolve(undefined)
            return
          }

          resolve({
            model_provider,
            api_configuration: selected.api_configuration
          })
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (params.panel_provider) {
            params.panel_provider.send_message({
              command: 'FOCUS_PROMPT_FIELD'
            })
          }
          if (!accepted) {
            resolve(undefined)
          }
        })

        quick_pick.show()
      }
    )
  }

  const model_provider = await params.api_providers_manager.get_model_provider(
    selected_api_configuration.model_provider_name
  )

  if (!model_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_edit_context_api_configuration',
      message: 'API provider not found for Edit Context tool.'
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_edit_context = async (
  panel_provider: PanelProvider,
  message: EditContextMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const api_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )

  const files_collector = new FilesCollector({
    workspace_provider: panel_provider.workspace_provider,
    open_editors_provider: panel_provider.open_editors_provider
  })

  const instructions = panel_provider.current_edit_context_instruction

  if (!instructions) {
    panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Instructions cannot be empty',
      type: 'warning'
    })
    return
  }

  const { instruction: processed_instructions, skill_definitions } =
    await replace_symbols({
      instruction: instructions,
      context: panel_provider.context,
      workspace_provider: panel_provider.workspace_provider
    })

  panel_provider.api_prompt_type == 'find-relevant-files'
  const collected = await files_collector.collect_files({})
  const collected_files = collected.other_files + collected.recent_files

  if (!collected_files) {
    panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Context cannot be empty',
      type: 'warning'
    })
    return
  }

  let current_api_configuration_id = message.api_configuration_id
  let should_show_quick_pick = message.use_quick_pick

  while (true) {
    const api_configuration_result = await get_edit_context_api_configuration({
      api_providers_manager,
      show_quick_pick: should_show_quick_pick,
      context: panel_provider.context,
      panel_provider,
      api_configuration_id: current_api_configuration_id
    })

    if (!api_configuration_result) {
      return
    }

    const { model_provider, api_configuration: edit_context_api_configuration } = api_configuration_result

    const endpoint_url = model_provider.base_url

    const edit_format =
      panel_provider.context.workspaceState.get<EditFormat>(
        API_EDIT_FORMAT_STATE_KEY
      ) ??
      panel_provider.context.globalState.get<EditFormat>(
        API_EDIT_FORMAT_STATE_KEY
      ) ??
      'whole'
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const instructions_key = {
      whole: 'editFormatInstructionsWhole',
      truncated: 'editFormatInstructionsTruncated',
      diff: 'editFormatInstructionsDiff',
      'search-replace': 'editFormatInstructionsSearchReplace'
    }[edit_format]
    const default_instructions = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
    }[edit_format]
    const edit_format_instructions =
      config.get<string>(instructions_key) || default_instructions

    let system_instructions_xml = ''
    if (edit_format_instructions) {
      system_instructions_xml = `<system>\n${edit_format_instructions}\n</system>`
    }

    const system_instructions =
      edit_context_api_configuration.system_instructions_override ||
      vscode.workspace
        .getConfiguration('codeWebChat')
        .get<string>('editContextSystemInstructions') ||
      default_system_instructions

    const part1 = `<files>\n${collected.other_files}`
    const part2 = `${collected.recent_files}</files>\n${skill_definitions}${
      system_instructions_xml ? system_instructions_xml + '\n' : ''
    }${processed_instructions}`

    const user_content = build_user_content({
      model_provider_name: model_provider.name,
      part1,
      part2
    })

    const messages = [
      ...(system_instructions
        ? [
            {
              role: 'system',
              content: system_instructions
            }
          ]
        : []),
      {
        role: 'user',
        content: user_content
      }
    ]

    let error_occurred = false
    let was_cancelled = false

    const promises = Array.from({ length: message.invocation_count }).map(
      async () => {
        const body: { [key: string]: any } = {
          messages,
          model: edit_context_api_configuration.model,
          temperature: edit_context_api_configuration.temperature
        }

        apply_reasoning_effort({
          body,
          model_provider,
          reasoning_effort: edit_context_api_configuration.reasoning_effort
        })

        try {
          const result = await panel_provider.api_manager.get({
            endpoint_url,
            api_key: model_provider.api_key,
            body,
            provider_name: edit_context_api_configuration.model_provider_name,
            model: edit_context_api_configuration.model,
            reasoning_effort: edit_context_api_configuration.reasoning_effort
          })

          if (result) {
            vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
              response: result.response,
              raw_instructions: instructions,
              edit_format,
              recent_api_configuration: {
                model_provider: edit_context_api_configuration.model_provider_name,
                model: edit_context_api_configuration.model,
                reasoning_effort: edit_context_api_configuration.reasoning_effort
              }
            })
            return true
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            was_cancelled = true
            return false
          }
          Logger.error({
            function_name: 'handle_edit_context',
            message: 'edit context task error',
            data: error
          })
          if (!error_occurred) {
            vscode.window.showErrorMessage(
              dictionary.error_message.EDIT_CONTEXT_ERROR
            )
            error_occurred = true
          }
          return false
        }
        return false
      }
    )

    const results = await Promise.all(promises)

    if (error_occurred || was_cancelled) return

    if (results.some((r) => r)) {
      return
    } else {
      should_show_quick_pick = true
      current_api_configuration_id = undefined
    }
  }
}
