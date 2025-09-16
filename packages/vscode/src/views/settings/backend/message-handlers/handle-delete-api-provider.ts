import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { ApiProvidersManager } from '@/services/model-providers-manager'
import { DeleteApiProviderMessage } from '@/views/settings/types/messages'
import { handle_get_api_providers } from './handle-get-api-providers'

export const handle_delete_api_provider = async (
  provider: SettingsProvider,
  message: DeleteApiProviderMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const provider_name_to_delete = message.provider_name

  const confirmation = await vscode.window.showWarningMessage(
    `Are you sure you want to delete the API provider "${provider_name_to_delete}"?`,
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
  await handle_get_api_providers(provider)
}
