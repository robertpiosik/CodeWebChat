import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { UpdateAgentConfigurationMessage } from '@/views/settings/types/messages'
import { update } from '@/views/shared/actions/agent/update'
import { t } from '@/i18n'

export const handle_update_agent_configuration = async (
  settings_provider: SettingsViewProvider,
  message: UpdateAgentConfigurationMessage
): Promise<void> => {
  if (message.is_new && message.origin === 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      t('views.common.handlers.common.confirm-discard-unsaved-changes', {
        item_type: 'agent'
      }),
      {
        modal: true,
        detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
          item_type: 'agent'
        })
      },
      discard_button
    )

    if (result != discard_button) {
      return
    }
  }

  const result = await update({
    updating_agent_configuration: message.updating_agent_configuration,
    updated_agent_configuration: message.updated_agent_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index
  })

  if (result.success) {
    settings_provider.postMessage({
      command: 'AGENT_CONFIGURATION_UPDATED'
    })
  }
}