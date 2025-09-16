import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  Provider
} from '@/services/model-providers-manager'
import { ChangeApiProviderKeyMessage } from '@/views/settings/types/messages'
import { handle_get_api_providers } from './handle-get-api-providers'

export const handle_change_api_provider_key = async (
  provider: SettingsProvider,
  message: ChangeApiProviderKeyMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const provider_name = message.provider_name

  const provider_to_update = (await providers_manager.get_providers()).find(
    (p) => p.name == provider_name
  )

  if (!provider_to_update) {
    vscode.window.showErrorMessage(`Provider "${provider_name}" not found.`)
    return
  }

  const new_api_key = await vscode.window.showInputBox({
    title: `API Key for ${provider_name}`,
    prompt: 'Enter your API key. Press Esc to keep the current one.',
    password: true,
    placeHolder: provider_to_update.api_key
      ? `...${provider_to_update.api_key.slice(-4)}`
      : 'No API key set'
  })

  if (new_api_key === undefined) {
    // User cancelled
    return
  }

  const updated_provider: Provider = {
    ...provider_to_update,
    api_key: new_api_key.trim()
  }

  const providers = await providers_manager.get_providers()
  const updated_providers = providers.map((p) =>
    p.name == provider_name ? updated_provider : p
  )
  await providers_manager.save_providers(updated_providers)

  await handle_get_api_providers(provider)
}
