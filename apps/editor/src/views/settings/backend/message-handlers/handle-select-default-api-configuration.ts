import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { SelectDefaultApiConfigurationMessage } from '@/views/settings/types/messages'
import { handle_set_default_api_configuration } from './handle-set-default-api-configuration'
import { t } from '@/i18n'
import { verify_model } from '@/views/shared/actions/api/create/interactions/verify-model'

export const handle_select_default_api_configuration = async (
  provider: SettingsProvider,
  message: SelectDefaultApiConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const api_configurations = await providers_manager.get_api_configurations()

  if (api_configurations.length == 0) {
    vscode.window.showInformationMessage(
      t('views.settings.handlers.select-default-api-configuration.no-configs')
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
  quick_pick.placeholder = t(
    'views.settings.handlers.select-default-api-configuration.placeholder'
  )
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
    quick_pick.hide()

    if (selected) {
      if (message.api_feature == 'voice-input') {
        const api_configuration = api_configurations.find(
          (c) => get_api_configuration_id(c) == selected.api_configuration_id
        )
        if (api_configuration) {
          const model_provider = await providers_manager.get_model_provider(
            api_configuration.model_provider_name
          )
          if (model_provider) {
            const is_valid = await verify_model({
              model: api_configuration.model,
              base_url: model_provider.base_url,
              api_key: model_provider.api_key,
              is_voice_input: true
            })
            if (!is_valid) {
              handle_select_default_api_configuration(provider, message)
              return
            }
          }
        }
      }

      await handle_set_default_api_configuration(
        provider,
        selected.api_configuration_id,
        message.api_feature
      )
    }
  })

  quick_pick.onDidHide(() => quick_pick.dispose())
  quick_pick.show()
}
