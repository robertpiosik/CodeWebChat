import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { DeleteModelProviderMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

export const handle_delete_model_provider = async (
  provider: SettingsViewProvider,
  message: DeleteModelProviderMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(
    provider.extension_context
  )
  const model_provider_name_to_delete = message.provider_name

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: dictionary.warning_message.CONFIRM_DELETE_MODEL_PROVIDER(
        model_provider_name_to_delete
      )
    },
    t('common.delete')
  )

  if (confirmation != t('common.delete')) {
    return
  }

  const original_model_providers = await providers_manager.get_model_providers()
  const deleted_provider_index = original_model_providers.findIndex(
    (p) => p.name == model_provider_name_to_delete
  )

  if (deleted_provider_index === -1) {
    return
  }

  const deleted_provider = original_model_providers[deleted_provider_index]

  const updated_model_providers = original_model_providers.filter(
    (p) => p.name != model_provider_name_to_delete
  )
  await providers_manager.save_model_providers(updated_model_providers)

  const undo_action = t(
    'views.settings.handlers.handle-delete-model-provider.undo'
  )
  const choice = await vscode.window.showInformationMessage(
    t('views.settings.handlers.handle-delete-model-provider.deleted'),
    undo_action
  )

  if (choice === undo_action) {
    const current_model_providers =
      await providers_manager.get_model_providers()
    current_model_providers.splice(deleted_provider_index, 0, deleted_provider)
    await providers_manager.save_model_providers(current_model_providers)
  }
}
