import * as vscode from 'vscode'
import { t } from '@/i18n'
import { open_settings } from '@/views/settings/helpers/open-settings'

export const show_incomplete_setup_warning = async (
  type: 'api' | 'web'
): Promise<void> => {
  const open_settings_label = t('common.open-settings')
  const result = await vscode.window.showWarningMessage(
    type == 'api'
      ? t('common.warning.no-api-configs')
      : t('common.info.no-items-created-yet', { items: 'chatbots' }),
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
