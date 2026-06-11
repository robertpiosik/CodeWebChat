import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { DeleteModelProviderMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'

export const handle_delete_model_provider = async (
  provider: SettingsProvider,
  message: DeleteModelProviderMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const model_provider_name_to_delete = message.provider_name

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: dictionary.warning_message.CONFIRM_DELETE_MODEL_PROVIDER(
        model_provider_name_to_delete
      )
    },
    'Delete'
  )

  if (confirmation != 'Delete') {
    return
  }

  const original_model_providers = await providers_manager.get_model_providers()
  const updated_model_providers = original_model_providers.filter(
    (p) => p.name != model_provider_name_to_delete
  )
  await providers_manager.save_model_providers(updated_model_providers)
}
