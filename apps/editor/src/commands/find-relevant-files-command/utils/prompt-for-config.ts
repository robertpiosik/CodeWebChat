import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_tool_config_id,
  ToolConfig,
  Provider
} from '../../../services/model-providers-manager'
import { RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY } from '../../../constants/state-keys'
import { display_token_count } from '../../../utils/display-token-count'
import { t } from '@/i18n'

export const prompt_for_config = async (params: {
  api_providers_manager: ModelProvidersManager
  extension_context: vscode.ExtensionContext
  configs: ToolConfig[]
  tokens_to_process: number
}): Promise<
  | { config: ToolConfig; provider: Provider; skipped: boolean }
  | 'back'
  | 'cancel'
> => {
  let selected_config: ToolConfig | undefined = undefined
  let skipped = false

  const default_config =
    await params.api_providers_manager.get_default_find_relevant_files_config()

  if (default_config) {
    selected_config = default_config
    skipped = true
  } else if (params.configs.length === 1) {
    selected_config = params.configs[0]
    skipped = true
  } else {
    const create_items = () => {
      const recent_ids =
        params.extension_context.workspaceState.get<string[]>(
          RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
        ) || []
      const matched_recent_configs: ToolConfig[] = []
      const remaining_configs: ToolConfig[] = []

      params.configs.forEach((config: ToolConfig) => {
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

      const map_config_to_item = (config: ToolConfig) => {
        const description_parts = [config.provider_name]
        if (config.temperature != null)
          description_parts.push(`${config.temperature}`)
        if (config.reasoning_effort)
          description_parts.push(`${config.reasoning_effort}`)

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

      if (matched_recent_configs.length > 0) {
        items.push({
          label: t('common.separator.recently-used'),
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...matched_recent_configs.map(map_config_to_item))
      }
      if (remaining_configs.length > 0) {
        if (matched_recent_configs.length > 0) {
          items.push({
            label: t('common.config.other'),
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...remaining_configs.map(map_config_to_item))
      }
      return items
    }

    const config_quick_pick = vscode.window.createQuickPick()
    config_quick_pick.items = create_items()
    config_quick_pick.title = t('common.config.title')
    config_quick_pick.placeholder = t('common.config.placeholder-with-tokens', {
      tokens: display_token_count(params.tokens_to_process)
    })
    config_quick_pick.matchOnDescription = true
    config_quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const items = config_quick_pick.items as (vscode.QuickPickItem & {
      id?: string
    })[]
    const first_selectable = items.find(
      (i) => i.kind !== vscode.QuickPickItemKind.Separator
    )
    if (first_selectable) {
      config_quick_pick.activeItems = [first_selectable]
    }

    const config_result = await new Promise<ToolConfig | 'back' | 'cancel'>(
      (resolve) => {
        let is_resolved = false
        config_quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            is_resolved = true
            resolve('back')
            config_quick_pick.hide()
          }
        })
        config_quick_pick.onDidAccept(() => {
          is_resolved = true
          const selected = config_quick_pick.selectedItems[0] as any
          resolve(selected?.config)
          config_quick_pick.hide()
        })
        config_quick_pick.onDidHide(() => {
          if (!is_resolved) {
            resolve('cancel')
          }
          config_quick_pick.dispose()
        })
        config_quick_pick.show()
      }
    )

    if (config_result === 'back') return 'back'
    if (config_result === 'cancel') return 'cancel'
    selected_config = config_result
  }

  if (selected_config) {
    const selected_id = get_tool_config_id(selected_config)
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

  const provider = await params.api_providers_manager.get_provider(
    selected_config.provider_name
  )
  if (!provider) {
    vscode.window.showErrorMessage(
      t('command.find-relevant-files.error.provider-not-found')
    )
    return 'cancel'
  }

  return { config: selected_config, provider, skipped }
}
