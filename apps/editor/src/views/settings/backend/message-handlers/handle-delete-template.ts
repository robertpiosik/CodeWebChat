import * as vscode from 'vscode'
import { DeleteTemplateMessage } from '@/views/settings/types/messages'
import { SettingsViewProvider } from '../settings-view-provider'
import { t } from '@/i18n'

export const handle_delete_template = async (
  provider: SettingsViewProvider,
  message: DeleteTemplateMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const templates = config.get<any[]>(message.templates_key, [])

  if (message.index < 0 || message.index >= templates.length) {
    return
  }

  const delete_action = t(
    'views.settings.handlers.handle-delete-template.action.delete'
  )
  const confirmation = await vscode.window.showWarningMessage(
    t('views.settings.handlers.handle-delete-template.confirm-title'),
    {
      modal: true,
      detail: t('views.settings.handlers.handle-delete-template.confirm-detail')
    },
    delete_action
  )

  if (confirmation !== delete_action) {
    return
  }

  const deleted_template = templates[message.index]
  const new_templates = templates.filter((_, i) => i !== message.index)

  await config.update(
    message.templates_key,
    new_templates,
    vscode.ConfigurationTarget.Global
  )

  const undo_action = t('common.undo')
  const choice = await vscode.window.showInformationMessage(
    t('views.settings.handlers.handle-delete-template.deleted'),
    undo_action
  )

  if (choice === undo_action) {
    const current_config = vscode.workspace.getConfiguration('codeWebChat')
    const current_templates = current_config.get<any[]>(
      message.templates_key,
      []
    )
    current_templates.splice(message.index, 0, deleted_template)
    await current_config.update(
      message.templates_key,
      current_templates,
      vscode.ConfigurationTarget.Global
    )
  }
}
