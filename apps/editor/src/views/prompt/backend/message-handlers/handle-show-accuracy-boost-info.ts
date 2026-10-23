import * as vscode from 'vscode'
import { t } from '@/i18n'

export const handle_show_accuracy_boost_info = async () => {
  await vscode.window.showInformationMessage(
    t('views.prompt.handlers.handle-show-accuracy-boost-info.message'),
    { modal: true }
  )
}
