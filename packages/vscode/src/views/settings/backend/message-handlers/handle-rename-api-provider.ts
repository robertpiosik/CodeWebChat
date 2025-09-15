import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  CustomProvider
} from '@/services/api-providers-manager'
import { RenameApiProviderMessage } from '@/views/settings/types/messages'
import { handle_get_api_providers } from './handle-get-api-providers'

export const handle_rename_api_provider = async (
  provider: SettingsProvider,
  message: RenameApiProviderMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const old_name = message.provider_name

  const provider_to_rename = (await providers_manager.get_providers()).find(
    (p) => p.name == old_name && p.type == 'custom'
  ) as CustomProvider

  if (!provider_to_rename) {
    vscode.window.showErrorMessage(`Provider "${old_name}" not found.`)
    return
  }

  const new_name = await vscode.window.showInputBox({
    title: 'Rename Provider',
    prompt: 'Enter a new name for the custom provider',
    value: old_name,
    validateInput: async (value) => {
      if (!value.trim()) return 'Name is required'
      if (
        value.trim() != old_name &&
        (await providers_manager.get_providers()).some(
          (p) => p.type == 'custom' && p.name == value.trim()
        )
      ) {
        return 'A provider with this name already exists'
      }
      return null
    }
  })

  if (new_name === undefined || new_name.trim() == old_name) {
    // User cancelled or didn't change the name
    return
  }

  const updated_provider: CustomProvider = {
    ...provider_to_rename,
    name: new_name.trim()
  }

  const providers = await providers_manager.get_providers()
  const updated_providers = providers.map((p) =>
    p.name == old_name && p.type == 'custom' ? updated_provider : p
  )
  await providers_manager.save_providers(updated_providers)

  await providers_manager.update_provider_name_in_configs({
    old_name,
    new_name: updated_provider.name
  })

  await handle_get_api_providers(provider)
}
