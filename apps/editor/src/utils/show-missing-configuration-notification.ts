import * as vscode from 'vscode'
import { t } from '@/i18n'
import { open_settings } from '@/views/settings/helpers/open-settings'

export const show_missing_configuration_notification = async (
  type: 'api' | 'web'
): Promise<void> => {
  const open_settings_label = t('common.open-settings')
  const result = await vscode.window.showInformationMessage(
    type == 'api'
      ? t(
          'utils.show-missing-configuration-notification.no-model-configurations-created-yet'
        )
      : t(
          'utils.show-missing-configuration-notification.no-chatbot-configurations-created-yet'
        ),
    open_settings_label
  )

  if (result == open_settings_label) {
    if (type == 'api') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const providers = config.get<any[]>('providers', [])

      if (providers.length == 0) {
        open_settings.api.providers()
      } else {
        open_settings.api.models()
      }
    } else {
      open_settings.web.chatbots()
    }
  }
}
