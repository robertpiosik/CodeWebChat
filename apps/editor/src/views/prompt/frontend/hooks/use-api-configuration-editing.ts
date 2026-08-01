import { useState, useEffect } from 'react'
import { ApiConfiguration, BackendMessage } from '../../types/messages'
import { post_message } from '../utils/post-message'
import { ApiFeature } from '@/views/shared/types/api-features'

export const use_api_configuration_editing = (vscode: any) => {
  const [updating_api_configuration, set_updating_api_configuration] =
    useState<ApiConfiguration>()
  const [updated_api_configuration, set_updated_api_configuration] =
    useState<ApiConfiguration>()
  const [is_new_api_configuration, set_is_new_api_configuration] =
    useState(false)
  const [
    api_configuration_insertion_index,
    set_api_configuration_insertion_index
  ] = useState<number>()
  const [api_configuration_api_feature, set_api_configuration_api_feature] =
    useState<ApiFeature | undefined>()

  const edit_api_configuration_back_click_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_API_CONFIGURATION',
      updating_api_configuration: updating_api_configuration!,
      updated_api_configuration: updated_api_configuration!,
      origin: 'cancel',
      is_new: is_new_api_configuration
    })
  }

  const edit_api_configuration_save_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_API_CONFIGURATION',
      updating_api_configuration: updating_api_configuration!,
      updated_api_configuration: updated_api_configuration!,
      origin: 'save',
      is_new: is_new_api_configuration,
      insertion_index: api_configuration_insertion_index,
      api_feature: api_configuration_api_feature
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'API_CONFIGURATION_UPDATED') {
        set_updating_api_configuration(undefined)
        set_updated_api_configuration(undefined)
        set_is_new_api_configuration(false)
        set_api_configuration_insertion_index(undefined)
        set_api_configuration_api_feature(undefined)
      } else if (message.command == 'START_API_CONFIGURATION_CREATION') {
        set_updating_api_configuration(message.api_configuration)
        set_updated_api_configuration(message.api_configuration)
        set_is_new_api_configuration(true)
        set_api_configuration_insertion_index(message.insertion_index)
        set_api_configuration_api_feature(message.api_feature)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    updating_api_configuration,
    set_updating_api_configuration,
    set_updated_api_configuration,
    edit_api_configuration_back_click_handler,
    edit_api_configuration_save_handler,
    set_is_new_api_configuration,
    set_api_configuration_insertion_index
  }
}
