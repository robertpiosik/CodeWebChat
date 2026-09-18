import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { ProvidersManager } from '@/services/providers-manager'
import { DeleteProviderMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'

export const handle_delete_provider = async (
  provider: SettingsViewProvider,
  message: DeleteProviderMessage
): Promise<void> => {
  const providers_manager = new ProvidersManager(provider.extension_context)
  const provider_name_to_delete = message.provider_name

  const confirmation = await vscode.window.showWarningMessage(
    t('common.confirm-action'),
    {
      modal: true,
      detail: t('common.confirm-delete-named-item', {
        item: 'provider',
        name: provider_name_to_delete
      })
    },
    t('common.delete')
  )

  if (confirmation != t('common.delete')) {
    return
  }

  const original_providers = await providers_manager.get_providers()
  const deleted_provider_index = original_providers.findIndex(
    (p) => p.name == provider_name_to_delete
  )

  if (deleted_provider_index === -1) {
    return
  }

  const deleted_provider = original_providers[deleted_provider_index]

  const updated_providers = original_providers.filter(
    (p) => p.name != provider_name_to_delete
  )
  await providers_manager.save_providers(updated_providers)

  const undo_action = t('common.undo')
  const choice = await vscode.window.showInformationMessage(
    t('common.success.item-deleted', { item: 'Provider' }),
    undo_action
  )

  if (choice === undo_action) {
    const current_providers = await providers_manager.get_providers()
    current_providers.splice(deleted_provider_index, 0, deleted_provider)
    await providers_manager.save_providers(current_providers)
  }
}
