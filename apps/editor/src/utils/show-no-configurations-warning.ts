import * as vscode from 'vscode'
import { t } from '@/i18n'
import { open_settings } from '@/views/settings/helpers/open-settings'

export const show_no_configurations_warning = async (
  type: 'api' | 'web'
): Promise<void> => {
  const open_settings_label = t('common.open-settings')
  const result = await vscode.window.showWarningMessage(
    t('common.missing-configuration'),
    { modal: true },
    open_settings_label
  )

  if (result === open_settings_label) {
    if (type == 'api') {
      open_settings.api.api_configurations()
    } else {
      open_settings.web.web_configurations()
    }
  }
}
