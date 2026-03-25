import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_tool_config_id,
  ToolConfig
} from '../../../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

export const get_code_at_cursor_config = async (params: {
  api_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
  config_id?: string
  panel_provider?: PanelProvider
}): Promise<{ provider: any; config: any } | undefined> => {
  const code_at_cursor_configs =
    await params.api_providers_manager.get_tool_configs()

  if (code_at_cursor_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | null = null

  if (params.config_id !== undefined) {
    selected_config =
      code_at_cursor_configs.find(
        (c) => get_tool_config_id(c) === params.config_id
      ) || null
  } else if (!params.show_quick_pick) {
    const default_config =
      await params.api_providers_manager.get_default_code_completions_config()
    if (default_config) {
      selected_config = default_config
    } else {
      const recents = params.context.workspaceState.get<string[]>(
        RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
      )
      const last_selected_id = recents?.[0]
      if (last_selected_id) {
        selected_config =
          code_at_cursor_configs.find(
            (c) => get_tool_config_id(c) == last_selected_id
          ) || null
      }
      if (!selected_config && code_at_cursor_configs.length > 0) {
        selected_config = code_at_cursor_configs[0]
      }
    }
  }

  if (!selected_config || params.show_quick_pick) {
    const create_items = () => {
      const recent_ids =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_configs: ToolConfig[] = []
      const remaining_configs: ToolConfig[] = []

      code_at_cursor_configs.forEach((config) => {
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

      const items: (vscode.QuickPickItem & {
        config?: ToolConfig
        id?: string
      })[] = []

      if (recent_configs.length > 0) {
        items.push({
          label: t('common.separator.recently-used'),
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...recent_configs.map(map_config_to_item))
      }

      if (other_configs.length > 0) {
        if (recent_configs.length > 0) {
          items.push({
            label: t('common.config.other'),
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...other_configs.map(map_config_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }
    ]
    quick_pick.items = create_items()
    quick_pick.title = t('common.config.title')
    quick_pick.placeholder = t('command.code-at-cursor.config.placeholder')
    quick_pick.matchOnDescription = true

    const items = quick_pick.items as (vscode.QuickPickItem & { id: string })[]

    if (items.length > 0) {
      const first_selectable = items.find(
        (i) => i.kind != vscode.QuickPickItemKind.Separator
      )
      if (first_selectable) {
        quick_pick.activeItems = [first_selectable]
      }
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerButton((button) => {
          if (button.tooltip == t('common.close')) {
            quick_pick.hide()
            resolve(undefined)
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected || !selected.config) {
            resolve(undefined)
            return
          }

          let recents =
            params.context.workspaceState.get<string[]>(
              RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
            ) || []
          recents = [selected.id, ...recents.filter((id) => id != selected.id)]
          params.context.workspaceState.update(
            RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY,
            recents
          )

          if (params.panel_provider) {
            params.panel_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              prompt_type: 'code-at-cursor',
              id: selected.id
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
          resolve(undefined)
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
      function_name: 'get_code_at_cursor_config',
      message: 'API provider not found for Code Completions tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}
