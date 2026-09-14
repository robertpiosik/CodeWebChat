import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'
import { ProvidersManager, Provider } from '@/services/providers-manager'
import { generate_unique_name } from '@/views/shared/utils/generate-unique-name'
import { UpdateProviderMessage } from '@/views/settings/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

export const handle_update_provider = async (
  provider: SettingsViewProvider,
  message: UpdateProviderMessage
): Promise<void> => {
  const a = message.updating_provider
  const b = message.provider
  let has_changes = false

  if (a && b) {
    has_changes =
      a.name !== b.name ||
      a.base_url !== b.base_url ||
      (b.api_key !== undefined && b.api_key !== '') ||
      b.is_api_key_cleared ||
      !!a.extended_cache !== !!b.extended_cache ||
      false
  } else if (message.is_new) {
    has_changes = true
  }

  if (!has_changes && !message.is_new) {
    if (message.origin === 'cancel') {
      provider.postMessage({ command: 'PROVIDER_UPDATED' })
      return
    }
  }

  if (message.is_new && message.origin === 'cancel' && !has_changes) {
    provider.postMessage({ command: 'PROVIDER_UPDATED' })
    return
  }

  if (message.origin === 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      t('views.common.handlers.common.confirm-discard-unsaved-changes', {
        item_type: 'provider'
      }),
      {
        modal: true,
        detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
          item_type: 'provider'
        })
      },
      discard_button
    )

    if (result != discard_button) {
      return
    }

    provider.postMessage({ command: 'PROVIDER_UPDATED' })
    return
  }

  if (!message.provider.base_url.trim()) {
    vscode.window.showErrorMessage('A Base URL is required for providers.')
    return
  }
  if (!message.provider.name.trim()) {
    vscode.window.showErrorMessage('A Name is required for providers.')
    return
  }

  const providers_manager = new ProvidersManager(provider.extension_context)
  const providers = await providers_manager.get_providers()

  const updated_providers = [...providers]
  let working_provider: Provider

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
          'provider',
          message.original_name!
        )
      )
      return
    }

    working_provider = { ...updated_providers[existing_index] }
    working_provider.name = message.provider.name.trim()
    working_provider.base_url = normalize_base_url(message.provider.base_url)
    working_provider.extended_cache = message.provider.extended_cache

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
      await providers_manager.update_provider_name_in_api_configurations({
        old_name: message.original_name!,
        new_name: working_provider.name
      })
    }
  } else {
    working_provider = {
      name: message.provider.name.trim(),
      base_url: normalize_base_url(message.provider.base_url),
      api_key: message.provider.api_key?.trim() || '',
      extended_cache: message.provider.extended_cache
    }

    working_provider.name = generate_unique_name(
      working_provider.name,
      updated_providers.map((p) => p.name)
    )

    if (message.insertion_index !== undefined) {
      updated_providers.splice(message.insertion_index, 0, working_provider)
    } else {
      updated_providers.push(working_provider)
    }
  }

  await providers_manager.save_providers(updated_providers)

  provider.postMessage({ command: 'PROVIDER_UPDATED' })

  const { handle_get_providers } = await import('./handle-get-providers')
  await handle_get_providers(provider)
}
