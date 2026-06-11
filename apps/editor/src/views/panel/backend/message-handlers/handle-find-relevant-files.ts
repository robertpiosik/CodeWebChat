import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ModelProvider,
  ApiConfiguration
} from '@/services/model-providers-manager'
import axios from 'axios'
import {
  RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY,
  FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { FindRelevantFilesMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import {
  find_relevant_files_instructions,
  find_relevant_files_format_for_panel
} from '@/constants/instructions'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'

const get_find_relevant_files_api_configuration = async (params: {
  api_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
  panel_provider: PanelProvider
  api_configuration_id?: string
}): Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined> => {
  const find_relevant_files_api_configurations =
    await params.api_providers_manager.get_api_configurations()

  if (find_relevant_files_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_FIND_RELEVANT_FILES_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      find_relevant_files_api_configurations.find(
        (c) => get_api_configuration_id(c) == params.api_configuration_id
      ) || null
    if (selected_api_configuration) {
      let recents =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
        ) || []
      recents = [
        params.api_configuration_id,
        ...recents.filter((id) => id != params.api_configuration_id)
      ]
      params.context.workspaceState.update(
        RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY,
        recents
      )

      if (params.panel_provider) {
        params.panel_provider.send_message({
          command: 'SELECTED_API_CONFIGURATION_CHANGED',
          prompt_type: 'find-relevant-files',
          id: params.api_configuration_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    const recents = params.context.workspaceState.get<string[]>(
      RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]

    if (last_selected_id) {
      selected_api_configuration =
        find_relevant_files_api_configurations.find(
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
          RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_api_configurations: ApiConfiguration[] = []
      const remaining_api_configurations: ApiConfiguration[] = []

      find_relevant_files_api_configurations.forEach((api_configuration) => {
        const id = get_api_configuration_id(api_configuration)
        if (recent_ids.includes(id)) {
          matched_recent_api_configurations.push(api_configuration)
        } else {
          remaining_api_configurations.push(api_configuration)
        }
      })

      matched_recent_api_configurations.sort((a, b) => {
        const idA = get_api_configuration_id(a)
        const idB = get_api_configuration_id(b)
        return recent_ids.indexOf(idA) - recent_ids.indexOf(idB)
      })

      const recent_api_configurations = matched_recent_api_configurations
      const other_api_configurations = remaining_api_configurations

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
          label: 'recently used',
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...recent_api_configurations.map(map_api_configuration_to_item))
      }

      if (other_api_configurations.length > 0) {
        if (recent_api_configurations.length > 0) {
          items.push({
            label: 'other API configurations',
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...other_api_configurations.map(map_api_configuration_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick<Item>()
    quick_pick.items = await create_items()
    quick_pick.title = 'API Configurations'
    quick_pick.placeholder = 'Select an API configuration'
    quick_pick.matchOnDescription = true
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]

    const recents = params.context.workspaceState.get<string[]>(
      RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
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
          if (button.tooltip == 'Close') {
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
              RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
            ) || []
          recents = [
            selected.id!,
            ...recents.filter((id) => id !== selected.id)
          ]
          params.context.workspaceState.update(
            RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY,
            recents
          )

          if (params.panel_provider) {
            params.panel_provider.send_message({
              command: 'SELECTED_API_CONFIGURATION_CHANGED',
              prompt_type: 'find-relevant-files',
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
      function_name: 'get_find_relevant_files_api_configuration',
      message: 'API provider not found for Find Relevant Files tool.'
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_find_relevant_files = async (
  panel_provider: PanelProvider,
  message: FindRelevantFilesMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const api_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )

  const files_collector = new FilesCollector({
    workspace_provider: panel_provider.workspace_provider,
    open_editors_provider: panel_provider.open_editors_provider
  })

  const instructions = panel_provider.current_find_relevant_files_instruction

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

  const shrink_source_code = panel_provider.context.workspaceState.get<boolean>(
    FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
    false
  )

  const collected = await files_collector.collect_files({
    shrink: shrink_source_code
  })
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
    const api_configuration_result = await get_find_relevant_files_api_configuration({
      api_providers_manager,
      show_quick_pick: should_show_quick_pick,
      context: panel_provider.context,
      panel_provider,
      api_configuration_id: current_api_configuration_id
    })

    if (!api_configuration_result) {
      return
    }

    panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { model_provider, api_configuration: find_relevant_files_api_configuration } = api_configuration_result

    const endpoint_url = model_provider.base_url

    const system_instructions_xml = `${find_relevant_files_format_for_panel}\n${find_relevant_files_instructions}`

    const part1 = `<files>\n${collected.other_files}`
    const part2 = `${collected.recent_files}</files>\n${skill_definitions}${system_instructions_xml}\n${processed_instructions}`

    const user_content = build_user_content({
      model_provider_name: model_provider.name,
      part1,
      part2,
      disable_cache: true
    })

    const messages = [
      {
        role: 'user',
        content: user_content
      }
    ]

    const body: { [key: string]: any } = {
      messages,
      model: find_relevant_files_api_configuration.model,
      temperature: find_relevant_files_api_configuration.temperature
    }

    apply_reasoning_effort({
      body,
      model_provider,
      reasoning_effort: find_relevant_files_api_configuration.reasoning_effort
    })

    try {
      const result = await panel_provider.api_manager.get({
        endpoint_url,
        api_key: model_provider.api_key,
        body,
        provider_name: find_relevant_files_api_configuration.model_provider_name,
        model: find_relevant_files_api_configuration.model,
        reasoning_effort: find_relevant_files_api_configuration.reasoning_effort
      })

      if (result) {
        vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
          response: result.response,
          raw_instructions: instructions,
          recent_api_configuration: {
            model_provider: find_relevant_files_api_configuration.model_provider_name,
            model: find_relevant_files_api_configuration.model,
            reasoning_effort: find_relevant_files_api_configuration.reasoning_effort
          }
        })
        return
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        return
      }
      Logger.error({
        function_name: 'handle_find_relevant_files',
        message: 'find relevant files task error',
        data: error
      })
      vscode.window.showErrorMessage(
        'Find relevant files error. See console for details.'
      )
      return
    }

    should_show_quick_pick = true
    current_api_configuration_id = undefined
  }
}

