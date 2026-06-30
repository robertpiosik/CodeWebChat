import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ApiConfiguration,
  ModelProvider
} from '../../../services/model-providers-manager'
import { RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY } from '../../../constants/state-keys'
import { display_token_count } from '../../../utils/display-token-count'
import { t } from '@/i18n'

export const prompt_for_api_configuration = async (params: {
  api_providers_manager: ModelProvidersManager
  extension_context: vscode.ExtensionContext
  api_configurations: ApiConfiguration[]
  tokens_to_process: number
  force_prompt?: boolean
}): Promise<
  | {
      api_configuration: ApiConfiguration
      model_provider: ModelProvider
      skipped: boolean
    }
  | 'back'
  | 'cancel'
> => {
  let selected_api_configuration: ApiConfiguration | undefined = undefined
  let skipped = false

  if (!params.force_prompt) {
    const default_api_configuration =
      await params.api_providers_manager.get_default_find_relevant_files_api_configuration()

    if (default_api_configuration) {
      selected_api_configuration = default_api_configuration
      skipped = true
    } else if (params.api_configurations.length === 1) {
      selected_api_configuration = params.api_configurations[0]
      skipped = true
    }
  }

  if (!selected_api_configuration) {
    const create_items = () => {
      const recent_ids =
        params.extension_context.workspaceState.get<string[]>(
          RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
        ) || []
      const matched_recent_api_configurations: ApiConfiguration[] = []
      const remaining_api_configurations: ApiConfiguration[] = []

      params.api_configurations.forEach(
        (api_configuration: ApiConfiguration) => {
          const id = get_api_configuration_id(api_configuration)
          if (recent_ids.includes(id)) {
            matched_recent_api_configurations.push(api_configuration)
          } else {
            remaining_api_configurations.push(api_configuration)
          }
        }
      )

      matched_recent_api_configurations.sort((a, b) => {
        const id_a = get_api_configuration_id(a)
        const id_b = get_api_configuration_id(b)
        return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
      })

      const map_api_configuration_to_item = (
        api_configuration: ApiConfiguration
      ) => {
        const description_parts = [api_configuration.model_provider_name]
        if (api_configuration.reasoning_effort)
          description_parts.push(`${api_configuration.reasoning_effort}`)

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

      if (matched_recent_api_configurations.length > 0) {
        items.push({
          label: t('common.separator.recently-used'),
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(
          ...matched_recent_api_configurations.map(
            map_api_configuration_to_item
          )
        )
      }
      if (remaining_api_configurations.length > 0) {
        if (matched_recent_api_configurations.length > 0) {
          items.push({
            label: t('common.config.other'),
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(
          ...remaining_api_configurations.map(map_api_configuration_to_item)
        )
      }
      return items
    }

    const api_configuration_quick_pick = vscode.window.createQuickPick()
    api_configuration_quick_pick.items = create_items()
    api_configuration_quick_pick.title = t('common.config.title')
    api_configuration_quick_pick.placeholder = t(
      'common.config.placeholder-with-tokens',
      {
        tokens: display_token_count(params.tokens_to_process)
      }
    )
    api_configuration_quick_pick.matchOnDescription = true
    api_configuration_quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const items =
      api_configuration_quick_pick.items as (vscode.QuickPickItem & {
        id?: string
      })[]
    const first_selectable = items.find(
      (i) => i.kind !== vscode.QuickPickItemKind.Separator
    )
    if (first_selectable) {
      api_configuration_quick_pick.activeItems = [first_selectable]
    }

    const api_configuration_result = await new Promise<
      ApiConfiguration | 'back' | 'cancel'
    >((resolve) => {
      let is_resolved = false
      api_configuration_quick_pick.onDidTriggerButton((button) => {
        if (button === vscode.QuickInputButtons.Back) {
          is_resolved = true
          resolve('back')
          api_configuration_quick_pick.hide()
        }
      })
      api_configuration_quick_pick.onDidAccept(() => {
        is_resolved = true
        const selected = api_configuration_quick_pick.selectedItems[0] as any
        resolve(selected?.api_configuration)
        api_configuration_quick_pick.hide()
      })
      api_configuration_quick_pick.onDidHide(() => {
        if (!is_resolved) {
          resolve('cancel')
        }
        api_configuration_quick_pick.dispose()
      })
      api_configuration_quick_pick.show()
    })

    if (api_configuration_result === 'back') return 'back'
    if (api_configuration_result === 'cancel') return 'cancel'
    selected_api_configuration = api_configuration_result
  }

  if (selected_api_configuration) {
    const selected_id = get_api_configuration_id(selected_api_configuration)
    const recents =
      params.extension_context.workspaceState.get<string[]>(
        RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
      ) || []
    const updated_recents = [
      selected_id,
      ...recents.filter((id) => id !== selected_id)
    ]
    await params.extension_context.workspaceState.update(
      RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY,
      updated_recents
    )
  }

  const model_provider = await params.api_providers_manager.get_model_provider(
    selected_api_configuration.model_provider_name
  )
  if (!model_provider) {
    vscode.window.showErrorMessage(t('command.search.error.provider-not-found'))
    return 'cancel'
  }

  return {
    api_configuration: selected_api_configuration,
    model_provider,
    skipped
  }
}
