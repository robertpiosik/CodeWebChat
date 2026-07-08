import { useState, useCallback, useEffect } from 'react'
import { ApiConfiguration } from '../../types/messages'
import { ApiFeature } from '@/views/shared/types/api-features'
import { post_message } from '../utils/post-message'

export const use_api_configuration_editing = (vscode: any) => {
  const [updating_api_configuration, set_updating_api_configuration] =
    useState<ApiConfiguration | null>(null)
  const [updated_api_configuration, set_updated_api_configuration] =
    useState<ApiConfiguration | null>(null)
  const [is_new_api_configuration, set_is_new_api_configuration] =
    useState(false)
  const [
    api_configuration_insertion_index,
    set_api_configuration_insertion_index
  ] = useState<number>()
  const [api_configuration_api_feature, set_api_configuration_api_feature] =
    useState<ApiFeature>()

  useEffect(() => {
    const handle_message = (event: MessageEvent) => {
      const message = event.data
      if (message.command === 'START_API_CONFIGURATION_CREATION') {
        set_is_new_api_configuration(true)
        set_updating_api_configuration(message.api_configuration)
        set_updated_api_configuration(message.api_configuration)
        set_api_configuration_insertion_index(message.insertion_index)
        set_api_configuration_api_feature(message.api_feature)
      } else if (message.command === 'API_CONFIGURATION_UPDATED') {
        set_updating_api_configuration(null)
        set_updated_api_configuration(null)
        set_is_new_api_configuration(false)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_api_configuration_cancel_handler = useCallback(() => {
    if (updating_api_configuration && updated_api_configuration) {
      post_message(vscode, {
        command: 'UPDATE_API_CONFIGURATION',
        updating_api_configuration,
        updated_api_configuration,
        origin: 'cancel',
        is_new: is_new_api_configuration,
        insertion_index: api_configuration_insertion_index,
        api_feature: api_configuration_api_feature
      })
    } else {
      set_updating_api_configuration(null)
      set_updated_api_configuration(null)
      set_is_new_api_configuration(false)
    }
  }, [
    vscode,
    updating_api_configuration,
    updated_api_configuration,
    is_new_api_configuration,
    api_configuration_insertion_index,
    api_configuration_api_feature
  ])

  const edit_api_configuration_save_handler = useCallback(() => {
    if (updating_api_configuration && updated_api_configuration) {
      post_message(vscode, {
        command: 'UPDATE_API_CONFIGURATION',
        updating_api_configuration,
        updated_api_configuration,
        origin: 'save',
        is_new: is_new_api_configuration,
        insertion_index: api_configuration_insertion_index,
        api_feature: api_configuration_api_feature
      })
    }
  }, [
    vscode,
    updating_api_configuration,
    updated_api_configuration,
    is_new_api_configuration,
    api_configuration_insertion_index,
    api_configuration_api_feature
  ])

  return {
    updating_api_configuration,
    set_updating_api_configuration,
    updated_api_configuration,
    set_updated_api_configuration,
    edit_api_configuration_cancel_handler,
    edit_api_configuration_save_handler
  }
}
