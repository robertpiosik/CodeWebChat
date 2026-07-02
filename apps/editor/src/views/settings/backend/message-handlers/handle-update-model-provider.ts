import * as vscode from 'vscode'
import { SettingsProvider } from '../settings-provider'
import {
  ModelProvidersManager,
  ModelProvider
} from '@/services/model-providers-manager'
import { generate_unique_name } from '@/views/shared/utils/generate-unique-name'
import { UpdateModelProviderMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'

export const handle_update_model_provider = async (
  provider: SettingsProvider,
  message: UpdateModelProviderMessage
): Promise<void> => {
  const a = message.updating_model_provider
  const b = message.provider
  let has_changes = false

  if (a && b) {
    has_changes =
      a.name !== b.name ||
      a.base_url !== b.base_url ||
      (b.api_key !== undefined && b.api_key !== '') ||
      b.is_api_key_cleared ||
      false
  } else if (message.is_new) {
    has_changes = true
  }

  if (!has_changes && !message.is_new) {
    if (message.origin === 'cancel') {
      provider.postMessage({ command: 'MODEL_PROVIDER_UPDATED' })
      return
    }
  }

  if (message.is_new && message.origin === 'cancel' && !has_changes) {
    provider.postMessage({ command: 'MODEL_PROVIDER_UPDATED' })
    return
  }

  if (message.origin === 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      dictionary.information_message.CONFIRM_DISCARD_UNSAVED_CHANGES(
        'model provider'
      ),
      {
        modal: true,
        detail:
          dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
            'model provider'
          )
      },
      discard_button
    )

    if (result != discard_button) {
      return
    }

    provider.postMessage({ command: 'MODEL_PROVIDER_UPDATED' })
    return
  }

  if (!message.provider.base_url.trim()) {
    vscode.window.showErrorMessage(
      'A Base URL is required for model providers.'
    )
    return
  }
  if (!message.provider.name.trim()) {
    vscode.window.showErrorMessage('A Name is required for model providers.')
    return
  }

  const providers_manager = new ModelProvidersManager(provider.context)
  const model_providers = await providers_manager.get_model_providers()

  const updated_providers = [...model_providers]
  let working_provider: ModelProvider

  const normalize_base_url = (url: string): string => {
    return url.trim().replace(/\/+$/, '')
  }

  if (!message.is_new) {
    const existing_index = updated_providers.findIndex(
      (p) => p.name == message.original_name
    )
    if (existing_index == -1) {
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
          'model provider',
          message.original_name!
        )
      )
      return
    }

    working_provider = { ...updated_providers[existing_index] }
    working_provider.name = message.provider.name.trim()
    working_provider.base_url = normalize_base_url(message.provider.base_url)

    if (message.provider.is_api_key_cleared) {
      working_provider.api_key = ''
    } else if (message.provider.api_key !== undefined) {
      working_provider.api_key = message.provider.api_key.trim()
    }

    working_provider.name = generate_unique_name(
      working_provider.name,
      updated_providers
        .filter((p) => p.name != message.original_name)
        .map((p) => p.name)
    )

    updated_providers[existing_index] = working_provider

    if (message.original_name != working_provider.name) {
      await providers_manager.update_model_provider_name_in_api_configurations({
        old_name: message.original_name!,
        new_name: working_provider.name
      })
    }
  } else {
    working_provider = {
      name: message.provider.name.trim(),
      base_url: normalize_base_url(message.provider.base_url),
      api_key: message.provider.api_key?.trim() || ''
    }

    working_provider.name = generate_unique_name(
      working_provider.name,
      updated_providers.map((p) => p.name)
    )

    if (message.create_on_top) {
      updated_providers.unshift(working_provider)
    } else if (message.insertion_index !== undefined) {
      updated_providers.splice(message.insertion_index, 0, working_provider)
    } else {
      updated_providers.push(working_provider)
    }
  }

  await providers_manager.save_model_providers(updated_providers)

  provider.postMessage({ command: 'MODEL_PROVIDER_UPDATED' })

  const { handle_get_model_providers } =
    await import('./handle-get-model-providers')
  await handle_get_model_providers(provider)
}
