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
  const provider_name_to_delete = message.provider_name

  const confirmation = await vscode.window.showWarningMessage(
    dictionary.warning_message.CONFIRM_DELETE_MODEL_PROVIDER(
      provider_name_to_delete
    ),
    { modal: true },
    'Delete'
  )

  if (confirmation !== 'Delete') {
    return
  }

  const original_providers = await providers_manager.get_providers()
  const updated_providers = original_providers.filter(
    (p) => p.name !== provider_name_to_delete
  )
  await providers_manager.save_providers(updated_providers)
}
