import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ReasoningEffort,
  get_tool_config_id,
  ToolConfig
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { PROVIDERS } from '@shared/constants/providers'
import { RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'

export interface CommitMessageConfig {
  provider_name: string
  model: string
  temperature?: number
  reasoning_effort?: ReasoningEffort
}

export const get_commit_message_config = async (
  context: vscode.ExtensionContext
): Promise<{
  config: CommitMessageConfig
  provider: any
  endpoint_url: string
} | null> => {
  const api_providers_manager = new ModelProvidersManager(context)
  let commit_message_config: CommitMessageConfig | null | undefined =
    await api_providers_manager.get_default_commit_messages_config()

  if (!commit_message_config) {
    const configs =
      await api_providers_manager.get_commit_messages_tool_configs()

    if (configs.length == 0) {
      vscode.commands.executeCommand('codeWebChat.settings')
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_COMMIT_MESSAGES_CONFIGURATIONS_FOUND
      )
      return null
    }

    if (configs.length == 1) {
      commit_message_config = configs[0]
    } else if (configs.length > 1) {
      const create_items = () => {
        const recent_ids =
          context.workspaceState.get<string[]>(
            RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY
          ) || []

        const matched_recent_configs: ToolConfig[] = []
        const remaining_configs: ToolConfig[] = []

        configs.forEach((config) => {
          const id = get_tool_config_id(config)
          if (recent_ids.includes(id)) {
            matched_recent_configs.push(config)
          } else {
            remaining_configs.push(config)
          }
        })

        matched_recent_configs.sort((a, b) => {
          const id_a = get_tool_config_id(a)
          const id_b = get_tool_config_id(b)
          return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
        })

        const recent_configs = matched_recent_configs
        const other_configs = remaining_configs

        const map_config_to_item = (config: ToolConfig) => {
          const description_parts = [config.provider_name]
          if (config.reasoning_effort) {
            description_parts.push(`${config.reasoning_effort}`)
          }
          if (config.temperature != null) {
            description_parts.push(`${config.temperature}`)
          }

          return {
            label: config.model,
            description: description_parts.join(' · '),
            config,
            id: get_tool_config_id(config)
          }
        }

        const items: (vscode.QuickPickItem & {
          config?: ToolConfig
          id?: string
        })[] = []

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

      const quick_pick = vscode.window.createQuickPick()
      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }

      quick_pick.buttons = [close_button]
      quick_pick.items = create_items()
      quick_pick.title = 'Configurations'
      quick_pick.placeholder = 'Select configuration'
      quick_pick.matchOnDescription = true

      const items = quick_pick.items as (vscode.QuickPickItem & {
        id: string
      })[]

      if (items.length > 0) {
        const first_selectable = items.find(
          (i) => i.kind != vscode.QuickPickItemKind.Separator
        )
        if (first_selectable) {
          quick_pick.activeItems = [first_selectable]
        }
      }

      commit_message_config = await new Promise<
        CommitMessageConfig | undefined
      >((resolve) => {
        quick_pick.onDidTriggerButton((button) => {
          if (button == close_button) {
            quick_pick.hide()
            resolve(undefined)
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (selected && selected.config) {
            let recents =
              context.workspaceState.get<string[]>(
                RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY
              ) || []
            recents = [
              selected.id,
              ...recents.filter((id) => id != selected.id)
            ]
            context.workspaceState.update(
              RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY,
              recents
            )

            resolve(selected.config)
          } else {
            resolve(undefined)
          }
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (quick_pick.selectedItems.length == 0) {
            resolve(undefined)
          }
        })

        quick_pick.show()
      })
    }
  }

  if (!commit_message_config) {
    return null
  }

  const provider = await api_providers_manager.get_provider(
    commit_message_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_FOR_CONFIG_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_commit_message_config',
      message: 'API provider not found for Commit Messages tool.'
    })
    return null
  }

  let endpoint_url = ''
  if (provider.type == 'built-in') {
    const provider_info = PROVIDERS[provider.name]
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  return {
    config: commit_message_config,
    provider,
    endpoint_url
  }
}
