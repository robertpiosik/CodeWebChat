import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ApiConfiguration
} from '../../../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

export const get_code_at_cursor_api_configuration = async (params: {
  api_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
  api_configuration_id?: string
  panel_provider?: PanelProvider
}): Promise<{ model_provider: any; api_configuration: any } | undefined> => {
  const code_at_cursor_api_configurations =
    await params.api_providers_manager.get_api_configurations()

  if (code_at_cursor_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      code_at_cursor_api_configurations.find(
        (c) => get_api_configuration_id(c) === params.api_configuration_id
      ) || null
  } else if (!params.show_quick_pick) {
    const default_api_configuration =
      await params.api_providers_manager.get_default_code_completions_api_configuration()
    if (default_api_configuration) {
      selected_api_configuration = default_api_configuration
    } else {
      const recents = params.context.workspaceState.get<string[]>(
        RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
      )
      const last_selected_id = recents?.[0]
      if (last_selected_id) {
        selected_api_configuration =
          code_at_cursor_api_configurations.find(
            (c) => get_api_configuration_id(c) == last_selected_id
          ) || null
      }
      if (
        !selected_api_configuration &&
        code_at_cursor_api_configurations.length > 0
      ) {
        selected_api_configuration = code_at_cursor_api_configurations[0]
      }
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const create_items = () => {
      const recent_ids =
        params.context.workspaceState.get<string[]>(
          RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_api_configurations: ApiConfiguration[] = []
      const remaining_api_configurations: ApiConfiguration[] = []

      code_at_cursor_api_configurations.forEach((api_configuration) => {
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

        const buttons: vscode.QuickInputButton[] = []

        return {
          label: api_configuration.model,
          description: description_parts.join(' · '),
          buttons,
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

    return new Promise<
      { model_provider: any; api_configuration: any } | undefined
    >((resolve) => {
      quick_pick.onDidTriggerButton((button) => {
        if (button.tooltip == t('common.close')) {
          quick_pick.hide()
          resolve(undefined)
        }
      })

      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0] as any
        quick_pick.hide()

        if (!selected || !selected.api_configuration) {
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
            command: 'SELECTED_API_CONFIGURATION_CHANGED',
            prompt_type: 'code-at-cursor',
            id: selected.id
          })
        }

        const model_provider =
          await params.api_providers_manager.get_model_provider(
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
        resolve(undefined)
      })

      quick_pick.show()
    })
  }

  const model_provider = await params.api_providers_manager.get_model_provider(
    selected_api_configuration.model_provider_name
  )

  if (!model_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_code_at_cursor_api_configuration',
      message: 'API provider not found for Code Completions tool.'
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}
