import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  Provider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { ChangeModelProviderKeyMessage } from '@/views/settings/types/messages'
import { handle_get_model_providers } from './handle-get-model-providers'
import { authenticate_chatgpt } from '../../../utils/upsert-model-provider'

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

  let new_api_key: string | undefined

  if (
    provider_to_update.name == 'ChatGPT' &&
    provider_to_update.type == 'built-in'
  ) {
    try {
      new_api_key = await authenticate_chatgpt()
      vscode.window.showInformationMessage('Authenticated successfully!', {
        modal: true,
        detail: 'Your ChatGPT session has been refreshed.'
      })
    } catch (error) {
      vscode.window.showErrorMessage(
        `ChatGPT authentication failed: ${error instanceof Error ? error.message : String(error)}`,
        { modal: true }
      )
      return
    }
  } else {
    new_api_key = await vscode.window.showInputBox({
      title: `API Key for ${provider_name}`,
      prompt: 'Enter your API key.',
      password: true,
      placeHolder: provider_to_update.api_key
        ? `...${provider_to_update.api_key.slice(-4)}`
        : ''
    })
  }

  if (new_api_key === undefined) {
    return
  }

  const trimmed_api_key = new_api_key.trim()

  if (trimmed_api_key == '' && provider_to_update.api_key) {
    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to clear the API key for ${provider_name}? This action cannot be undone.`,
      { modal: true },
      'Clear API Key'
    )

    if (confirmation != 'Clear API Key') {
      return
    }
  }

  const updated_provider: Provider = {
    ...provider_to_update,
    api_key: trimmed_api_key
  }

  const providers = await providers_manager.get_providers()
  const updated_providers = providers.map((p) =>
    p.name == provider_name ? updated_provider : p
  )
  await providers_manager.save_providers(updated_providers)
  await handle_get_model_providers(provider)
}
