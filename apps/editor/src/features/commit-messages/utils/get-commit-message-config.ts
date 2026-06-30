import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ApiConfiguration
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import { display_token_count } from '@/utils/display-token-count'
import { RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import { t } from '@/i18n'

export interface CommitMessageApiConfiguration {
  model_provider_name: string
  model: string
  temperature?: number
  reasoning_effort?: string
}

export const get_commit_message_api_configuration = async (
  context: vscode.ExtensionContext,
  show_back_button: boolean = true,
  force_quick_pick: boolean = false,
  token_count?: number
): Promise<
  | {
      api_configuration: CommitMessageApiConfiguration
      model_provider: any
      endpoint_url: string
    }
  | 'back'
  | null
> => {
  const api_providers_manager = new ModelProvidersManager(context)
  let commit_message_api_configuration:
    | CommitMessageApiConfiguration
    | null
    | undefined
    | 'back' = force_quick_pick
    ? undefined
    : await api_providers_manager.get_default_commit_messages_api_configuration()

  if (!commit_message_api_configuration) {
    const api_configurations =
      await api_providers_manager.get_api_configurations()

    if (api_configurations.length == 0) {
      vscode.commands.executeCommand('codeWebChat.settings')
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_COMMIT_MESSAGES_CONFIGURATIONS_FOUND
      )
      return null
    }

    if (api_configurations.length == 1 && !force_quick_pick) {
      commit_message_api_configuration = api_configurations[0]
    } else if (api_configurations.length >= 1) {
      const create_items = () => {
        const recent_ids =
          context.workspaceState.get<string[]>(
            RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY
          ) || []

        const matched_recent_api_configurations: ApiConfiguration[] = []
        const remaining_api_configurations: ApiConfiguration[] = []

        api_configurations.forEach((api_configuration) => {
          const id = get_api_configuration_id(api_configuration)
          if (recent_ids.includes(id)) {
            matched_recent_api_configurations.push(api_configuration)
          } else {
            remaining_api_configurations.push(api_configuration)
          }
        })

        matched_recent_api_configurations.sort((a, b) => {
          const id_a = get_api_configuration_id(a)
          const id_b = get_api_configuration_id(b)
          return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
        })

        const recent_api_configurations = matched_recent_api_configurations
        const other_api_configurations = remaining_api_configurations

        const map_api_configuration_to_item = (
          api_configuration: ApiConfiguration
        ) => {
          const description_parts = [api_configuration.model_provider_name]
          if (api_configuration.reasoning_effort) {
            description_parts.push(`${api_configuration.reasoning_effort}`)
          }

          return {
            label: api_configuration.model,
            description: description_parts.join(' · '),
            api_configuration,
            id: get_api_configuration_id(api_configuration)
          }
        }

        const items: (vscode.QuickPickItem & {
          api_configuration?: ApiConfiguration
          id?: string
        })[] = []

        if (recent_api_configurations.length > 0) {
          items.push({
            label: t('common.separator.recently-used'),
            kind: vscode.QuickPickItemKind.Separator
          })
          items.push(
            ...recent_api_configurations.map(map_api_configuration_to_item)
          )
        }

        if (other_api_configurations.length > 0) {
          if (recent_api_configurations.length > 0) {
            items.push({
              label: t('common.config.other'),
              kind: vscode.QuickPickItemKind.Separator
            })
          }
          items.push(
            ...other_api_configurations.map(map_api_configuration_to_item)
          )
        }

        return items
      }

      const quick_pick = vscode.window.createQuickPick()

      if (show_back_button) {
        quick_pick.buttons = [vscode.QuickInputButtons.Back]
      } else {
        quick_pick.buttons = [
          {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
        ]
      }

      quick_pick.items = create_items()
      quick_pick.title = t('common.config.title')
      quick_pick.placeholder =
        token_count != null
          ? t('common.config.placeholder-with-tokens', {
              tokens: display_token_count(token_count)
            })
          : t('common.config.placeholder')
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

      commit_message_api_configuration = await new Promise<
        CommitMessageApiConfiguration | 'back' | undefined
      >((resolve) => {
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            quick_pick.hide()
            resolve('back')
          } else if (button.tooltip === t('common.close')) {
            quick_pick.hide()
            resolve(undefined)
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (selected && selected.api_configuration) {
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

            resolve(selected.api_configuration)
          } else {
            resolve(undefined)
          }
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (quick_pick.selectedItems.length == 0) {
            resolve('back')
          }
        })

        quick_pick.show()
      })
    }
  }

  if (commit_message_api_configuration === 'back') {
    return 'back'
  }

  if (!commit_message_api_configuration) {
    return null
  }

  const model_provider = await api_providers_manager.get_model_provider(
    commit_message_api_configuration.model_provider_name
  )

  if (!model_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_FOR_CONFIG_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_commit_message_api_configuration',
      message: 'API provider not found for Commit Messages tool.'
    })
    return null
  }

  const endpoint_url = model_provider.base_url

  return {
    api_configuration: commit_message_api_configuration,
    model_provider,
    endpoint_url
  }
}
