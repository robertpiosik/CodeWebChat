import { useState, useCallback, useEffect } from 'react'
import { Provider } from '../../types/messages'
import { post_message } from '../utils/post-message'
import { ModelProviderDraft } from '../forms/EditModelProviderForm'

export const use_model_provider_editing = (vscode: any) => {
  const [updating_model_provider, set_updating_model_provider] = useState<{
    original_name?: string
    provider: Provider
  } | null>(null)
  const [updated_model_provider, set_updated_model_provider] =
    useState<ModelProviderDraft | null>(null)
  const [is_new_model_provider, set_is_new_model_provider] = useState(false)
  const [model_provider_insertion_index, set_model_provider_insertion_index] =
    useState<number>()
  const [model_provider_create_on_top, set_model_provider_create_on_top] =
    useState<boolean>()

  useEffect(() => {
    const handle_message = (event: MessageEvent) => {
      const message = event.data
      if (message.command == 'START_MODEL_PROVIDER_CREATION') {
        set_is_new_model_provider(true)
        set_updating_model_provider({ provider: message.provider })
        set_model_provider_insertion_index(message.insertion_index)
        set_model_provider_create_on_top(message.create_on_top)
      } else if (message.command == 'MODEL_PROVIDER_UPDATED') {
        set_updating_model_provider(null)
        set_updated_model_provider(null)
        set_is_new_model_provider(false)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_model_provider_cancel_handler = useCallback(() => {
    if (updating_model_provider && updated_model_provider) {
      post_message(vscode, {
        command: 'UPDATE_MODEL_PROVIDER',
        original_name: updating_model_provider.original_name,
        updating_model_provider: updating_model_provider.provider,
        provider: updated_model_provider,
        origin: 'cancel',
        is_new: is_new_model_provider,
        insertion_index: model_provider_insertion_index,
        create_on_top: model_provider_create_on_top
      })
    } else {
      set_updating_model_provider(null)
      set_updated_model_provider(null)
      set_is_new_model_provider(false)
    }
  }, [
    vscode,
    updating_model_provider,
    updated_model_provider,
    is_new_model_provider,
    model_provider_insertion_index,
    model_provider_create_on_top
  ])

  const edit_model_provider_save_handler = useCallback(() => {
    if (updating_model_provider && updated_model_provider) {
      post_message(vscode, {
        command: 'UPDATE_MODEL_PROVIDER',
        original_name: updating_model_provider.original_name,
        updating_model_provider: updating_model_provider.provider,
        provider: updated_model_provider,
        origin: 'save',
        is_new: is_new_model_provider,
        insertion_index: model_provider_insertion_index,
        create_on_top: model_provider_create_on_top
      })
    }
  }, [
    vscode,
    updating_model_provider,
    updated_model_provider,
    is_new_model_provider,
    model_provider_insertion_index,
    model_provider_create_on_top
  ])

  return {
    updating_model_provider,
    set_updating_model_provider,
    updated_model_provider,
    set_updated_model_provider,
    edit_model_provider_cancel_handler,
    edit_model_provider_save_handler,
    set_is_new_model_provider
  }
}
