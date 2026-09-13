import { useState, useCallback, useEffect } from 'react'
import { Provider } from '../../types/messages'
import { post_message } from '../utils/post-message'
import { ProviderDraft } from '../forms/EditProviderForm'

export const use_provider_editing = (vscode: any) => {
  const [updating_provider, set_updating_provider] = useState<{
    original_name?: string
    provider: Provider
  } | null>(null)
  const [updated_provider, set_updated_provider] =
    useState<ProviderDraft | null>(null)
  const [is_new_provider, set_is_new_provider] = useState(false)
  const [provider_insertion_index, set_provider_insertion_index] =
    useState<number>()
  useEffect(() => {
    const handle_message = (event: MessageEvent) => {
      const message = event.data
      if (message.command == 'START_PROVIDER_CREATION') {
        set_is_new_provider(true)
        set_updating_provider({ provider: message.provider })
        set_provider_insertion_index(message.insertion_index)
      } else if (message.command == 'PROVIDER_UPDATED') {
        set_updating_provider(null)
        set_updated_provider(null)
        set_is_new_provider(false)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_provider_cancel_handler = useCallback(() => {
    if (updating_provider && updated_provider) {
      post_message(vscode, {
        command: 'UPDATE_PROVIDER',
        original_name: updating_provider.original_name,
        updating_provider: updating_provider.provider,
        provider: updated_provider,
        origin: 'cancel',
        is_new: is_new_provider,
        insertion_index: provider_insertion_index
      })
    } else {
      set_updating_provider(null)
      set_updated_provider(null)
      set_is_new_provider(false)
    }
  }, [
    vscode,
    updating_provider,
    updated_provider,
    is_new_provider,
    provider_insertion_index
  ])

  const edit_provider_save_handler = useCallback(() => {
    if (updating_provider && updated_provider) {
      post_message(vscode, {
        command: 'UPDATE_PROVIDER',
        original_name: updating_provider.original_name,
        updating_provider: updating_provider.provider,
        provider: updated_provider,
        origin: 'save',
        is_new: is_new_provider,
        insertion_index: provider_insertion_index
      })
    }
  }, [
    vscode,
    updating_provider,
    updated_provider,
    is_new_provider,
    provider_insertion_index
  ])

  return {
    updating_provider,
    set_updating_provider,
    updated_provider,
    set_updated_provider,
    edit_provider_cancel_handler,
    edit_provider_save_handler,
    set_is_new_provider
  }
}
