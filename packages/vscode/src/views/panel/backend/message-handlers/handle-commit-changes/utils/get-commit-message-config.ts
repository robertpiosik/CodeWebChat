import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  ReasoningEffort,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { PROVIDERS } from '@shared/constants/providers'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import { LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'

export interface CommitMessageConfig {
  provider_name: string
  model: string
  temperature: number
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
    if (configs.length == 1) {
      commit_message_config = configs[0]
    } else if (configs.length > 1) {
      const set_default_button = {
        iconPath: new vscode.ThemeIcon('star'),
        tooltip: 'Set as default'
      }

      const unset_default_button = {
        iconPath: new vscode.ThemeIcon('star-full'),
        tooltip: 'Unset default'
      }

      const create_items = async () => {
        const default_config =
          await api_providers_manager.get_default_commit_messages_config()

        return configs.map((config, index) => {
          const buttons = []

          const is_default =
            default_config &&
            default_config.provider_name == config.provider_name &&
            default_config.model == config.model &&
            default_config.temperature == config.temperature &&
            default_config.reasoning_effort == config.reasoning_effort

          if (is_default) {
            buttons.push(unset_default_button)
          } else {
            buttons.push(set_default_button)
          }

          const description_parts = [config.provider_name]
          if (config.reasoning_effort) {
            description_parts.push(`${config.reasoning_effort}`)
          }
          if (config.temperature != DEFAULT_TEMPERATURE['commit-messages']) {
            description_parts.push(`${config.temperature}`)
          }

          return {
            label: is_default ? `$(pass-filled) ${config.model}` : config.model,
            description: description_parts.join(' · '),
            config,
            index,
            id: get_tool_config_id(config),
            buttons
          }
        })
      }

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = await create_items()
      quick_pick.placeholder = 'Select configuration for commit message'
      quick_pick.matchOnDescription = true

      const last_selected_id =
        context.workspaceState.get<string>(
          LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY
        ) ??
        context.globalState.get<string>(
          LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY
        )
      const last_selected_item = (
        quick_pick.items as (vscode.QuickPickItem & { id: string })[]
      ).find((item) => item.id === last_selected_id)

      if (last_selected_item) {
        quick_pick.activeItems = [last_selected_item]
      } else if (quick_pick.items.length > 0) {
        quick_pick.activeItems = [quick_pick.items[0]]
      }

      commit_message_config = await new Promise<
        CommitMessageConfig | undefined
      >((resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any
          const button = event.button
          const index = item.index

          if (button === set_default_button) {
            await api_providers_manager.set_default_commit_messages_config(
              configs[index]
            )
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_commit_messages_config(
              null as any
            )
          }
          quick_pick.items = await create_items()
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (selected) {
            context.workspaceState.update(
              LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY,
              selected.id
            )
            context.globalState.update(
              LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY,
              selected.id
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
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_COMMIT_MESSAGES_CONFIGURATIONS_FOUND
    )
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
