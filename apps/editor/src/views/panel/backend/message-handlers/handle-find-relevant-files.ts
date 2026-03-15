import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_tool_config_id,
  Provider,
  ToolConfig
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

const get_find_relevant_files_config = async (params: {
  api_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
  panel_provider: PanelProvider
  config_id?: string
}): Promise<{ provider: Provider; config: ToolConfig } | undefined> => {
  const find_relevant_files_configs =
    await params.api_providers_manager.get_find_relevant_files_tool_configs()

  if (find_relevant_files_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_FIND_RELEVANT_FILES_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | null = null

  if (params.config_id !== undefined) {
    selected_config =
      find_relevant_files_configs.find(
        (c) => get_tool_config_id(c) == params.config_id
      ) || null
    if (selected_config) {
      let recents =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
        ) || []
      recents = [
        params.config_id,
        ...recents.filter((id) => id != params.config_id)
      ]
      params.context.workspaceState.update(
        RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY,
        recents
      )

      if (params.panel_provider) {
        params.panel_provider.send_message({
          command: 'SELECTED_CONFIGURATION_CHANGED',
          prompt_type: 'find-relevant-files',
          id: params.config_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    const recents = params.context.workspaceState.get<string[]>(
      RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]

    if (last_selected_id) {
      selected_config =
        find_relevant_files_configs.find(
          (c) => get_tool_config_id(c) == last_selected_id
        ) || null
    }
  }

  if (!selected_config || params.show_quick_pick) {
    type Item = vscode.QuickPickItem & {
      config?: ToolConfig
      id?: string
    }
    const create_items = async (): Promise<Item[]> => {
      const recent_ids =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_configs: ToolConfig[] = []
      const remaining_configs: ToolConfig[] = []

      find_relevant_files_configs.forEach((config) => {
        const id = get_tool_config_id(config)
        if (recent_ids.includes(id)) {
          matched_recent_configs.push(config)
        } else {
          remaining_configs.push(config)
        }
      })

      matched_recent_configs.sort((a, b) => {
        const idA = get_tool_config_id(a)
        const idB = get_tool_config_id(b)
        return recent_ids.indexOf(idA) - recent_ids.indexOf(idB)
      })

      const recent_configs = matched_recent_configs
      const other_configs = remaining_configs

      const map_config_to_item = (config: ToolConfig) => {
        const description_parts = [config.provider_name]
        if (config.temperature != null) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }

        const buttons: vscode.QuickInputButton[] = []

        return {
          label: config.model,
          description: description_parts.join(' · '),
          buttons,
          config,
          id: get_tool_config_id(config)
        }
      }

      const items: Item[] = []

      if (recent_configs.length > 0) {
        items.push({
          label: 'recently used',
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...recent_configs.map(map_config_to_item))
      }

      if (other_configs.length > 0) {
        if (recent_configs.length > 0) {
          items.push({
            label: 'other configurations',
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...other_configs.map(map_config_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick<Item>()
    quick_pick.items = await create_items()
    quick_pick.title = 'Configurations'
    quick_pick.placeholder = 'Select configuration'
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

    return new Promise<{ provider: Provider; config: ToolConfig } | undefined>(
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

          if (!selected || !selected.config) {
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
              command: 'SELECTED_CONFIGURATION_CHANGED',
              prompt_type: 'find-relevant-files',
              id: selected.id!
            })
          }

          const provider = await params.api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_NOT_FOUND
            )
            resolve(undefined)
            return
          }

          resolve({
            provider,
            config: selected.config
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

  const provider = await params.api_providers_manager.get_provider(
    selected_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_find_relevant_files_config',
      message: 'API provider not found for Find Relevant Files tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
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

  let current_config_id = message.config_id
  let should_show_quick_pick = message.use_quick_pick

  while (true) {
    const config_result = await get_find_relevant_files_config({
      api_providers_manager,
      show_quick_pick: should_show_quick_pick,
      context: panel_provider.context,
      panel_provider,
      config_id: current_config_id
    })

    if (!config_result) {
      return
    }

    panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { provider, config: find_relevant_files_config } = config_result

    const endpoint_url = provider.base_url

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const config_find_relevant_files_instructions = config.get<string>(
      'findRelevantFilesInstructions'
    )
    const instructions_to_use =
      config_find_relevant_files_instructions ||
      find_relevant_files_instructions
    const system_instructions_xml = `${find_relevant_files_format_for_panel}\n${instructions_to_use}`

    const part1 = `<files>\n${collected.other_files}`
    const part2 = `${collected.recent_files}</files>\n${skill_definitions}${system_instructions_xml}\n${processed_instructions}`

    const user_content = build_user_content({
      provider_name: provider.name,
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
      model: find_relevant_files_config.model,
      temperature: find_relevant_files_config.temperature
    }

    apply_reasoning_effort({
      body,
      provider,
      reasoning_effort: find_relevant_files_config.reasoning_effort
    })

    try {
      const result = await panel_provider.api_manager.get({
        endpoint_url,
        api_key: provider.api_key,
        body,
        provider_name: find_relevant_files_config.provider_name,
        model: find_relevant_files_config.model,
        reasoning_effort: find_relevant_files_config.reasoning_effort
      })

      if (result) {
        vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
          response: result.response,
          raw_instructions: instructions,
          api_configuration: {
            provider: find_relevant_files_config.provider_name,
            model: find_relevant_files_config.model,
            reasoning_effort: find_relevant_files_config.reasoning_effort
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
    current_config_id = undefined
  }
}
