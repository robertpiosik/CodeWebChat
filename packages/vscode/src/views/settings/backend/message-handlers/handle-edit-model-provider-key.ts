import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  Provider
} from '@/services/model-providers-manager'
import { dictionary } from '@/constants/dictionary'
import { ChangeModelProviderKeyMessage } from '@/views/settings/types/messages'
import { handle_get_model_providers } from './handle-get-model-providers'

export const handle_change_model_provider_key = async (
  provider: SettingsProvider,
  message: ChangeModelProviderKeyMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const provider_name = message.provider_name

  const provider_to_update = (await providers_manager.get_providers()).find(
    (p) => p.name == provider_name
  )

  if (!provider_to_update) {
    vscode.window.showErrorMessage(
      dictionary.error_message.PROVIDER_NOT_FOUND_BY_NAME(provider_name)
    )
    return
  }

  const new_api_key = await vscode.window.showInputBox({
    title: `Model API Key for ${provider_name}`,
    prompt: 'Enter your model API key. Press Esc to keep the current one.',
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

  await handle_get_model_providers(provider)
}
