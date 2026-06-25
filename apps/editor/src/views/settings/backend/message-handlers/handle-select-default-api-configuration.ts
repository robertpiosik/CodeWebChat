import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { SelectDefaultApiConfigurationMessage } from '@/views/settings/types/messages'
import { handle_set_default_api_configuration } from './handle-set-default-api-configuration'
import { t } from '@/i18n'

export const handle_select_default_api_configuration = async (
  provider: SettingsProvider,
  message: SelectDefaultApiConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const api_configurations = await providers_manager.get_api_configurations()

  if (api_configurations.length == 0) {
    vscode.window.showInformationMessage(
      t('handlers.settings.api-config.no-configs')
    )
    return
  }

  const items = api_configurations.map((c) => {
    const description_parts = [c.model_provider_name]
    if (c.reasoning_effort) {
      description_parts.push(`${c.reasoning_effort}`)
    }

    return {
      label: c.model,
      description: description_parts.join(' · '),
      api_configuration_id: get_api_configuration_id(c)
    }
  })

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { api_configuration_id: string }
  >()

  quick_pick.items = items
  quick_pick.title = t('common.config.title')
  quick_pick.placeholder = t('handlers.settings.api-config.placeholder')
  quick_pick.matchOnDescription = true

  const close_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  quick_pick.buttons = [close_button]

  quick_pick.onDidTriggerButton((button) => {
    if (button === close_button) {
      quick_pick.hide()
    }
  })

  quick_pick.onDidAccept(async () => {
    const selected = quick_pick.selectedItems[0]
    if (selected) {
      await handle_set_default_api_configuration(
        provider,
        selected.api_configuration_id,
        message.tool_name
      )
    }
    quick_pick.hide()
  })

  quick_pick.onDidHide(() => quick_pick.dispose())
  quick_pick.show()
}
