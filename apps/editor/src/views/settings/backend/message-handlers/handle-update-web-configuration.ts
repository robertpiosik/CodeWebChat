import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateWebConfigurationMessage } from '@/views/settings/types/messages'
import { update } from '@/views/shared/actions/web/update'

export const handle_update_web_configuration = async (
  settings_provider: SettingsProvider,
  message: UpdateWebConfigurationMessage
): Promise<void> => {
  if (message.is_new && message.origin === 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      dictionary.information_message.CONFIRM_DISCARD_UNSAVED_CHANGES(
        'web configuration'
      ),
      {
        modal: true,
        detail:
          dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
            'web configuration'
          )
      },
      discard_button
    )

    if (result != discard_button) {
      return
    }
  }

  const result = await update({
    updating_web_configuration: message.updating_web_configuration,
    updated_web_configuration: message.updated_web_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index
  })

  if (result.success) {
    settings_provider.postMessage({
      command: 'WEB_CONFIGURATION_UPDATED'
    })
  }
}
