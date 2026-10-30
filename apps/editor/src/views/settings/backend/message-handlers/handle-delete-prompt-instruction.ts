import * as vscode from 'vscode'
import { DeletePromptInstructionMessage } from '@/views/settings/types/messages'
import { SettingsViewProvider } from '../settings-view-provider'
import { t } from '@/i18n'

export const handle_delete_prompt_instruction = async (
  provider: SettingsViewProvider,
  message: DeletePromptInstructionMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const items = config.get<any[]>(message.key, [])

  if (message.index < 0 || message.index >= items.length) {
    return
  }

  const delete_action = t('common.delete')
  const is_template = message.key.startsWith('templates')
  const item_name = is_template ? 'template' : 'snippet'
  const confirmation = await vscode.window.showWarningMessage(
    t('views.settings.handlers.handle-delete-template.confirm-title'),
    {
      modal: true,
      detail: t('common.confirm-delete-item', { item: item_name })
    },
    delete_action
  )

  if (confirmation !== delete_action) {
    return
  }

  const deleted_item = items[message.index]
  const new_items = items.filter((_, i) => i !== message.index)

  await config.update(message.key, new_items, vscode.ConfigurationTarget.Global)

  const undo_action = t('common.undo')
  const choice = await vscode.window.showInformationMessage(
    t('common.success.item-deleted', {
      item: is_template ? 'Template' : 'Snippet'
    }),
    undo_action
  )

  if (choice === undo_action) {
    const current_config = vscode.workspace.getConfiguration('codeWebChat')
    const current_items = current_config.get<any[]>(message.key, [])
    current_items.splice(message.index, 0, deleted_item)
    await current_config.update(
      message.key,
      current_items,
      vscode.ConfigurationTarget.Global
    )
  }
}
