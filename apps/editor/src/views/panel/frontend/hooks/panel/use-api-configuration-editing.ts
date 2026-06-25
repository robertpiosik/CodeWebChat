import { useState, useEffect } from 'react'
import { ApiConfiguration, BackendMessage } from '../../../types/messages'
import { post_message } from '../../utils/post-message'

export const use_api_configuration_editing = (vscode: any) => {
  const [updating_api_configuration, set_updating_api_configuration] =
    useState<ApiConfiguration>()
  const [updated_api_configuration, set_updated_api_configuration] =
    useState<ApiConfiguration>()

  const edit_api_configuration_back_click_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_API_CONFIGURATION',
      updating_api_configuration: updating_api_configuration!,
      updated_api_configuration: updated_api_configuration!,
      origin: 'cancel'
    })
  }

  const edit_api_configuration_save_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_API_CONFIGURATION',
      updating_api_configuration: updating_api_configuration!,
      updated_api_configuration: updated_api_configuration!,
      origin: 'save'
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'API_CONFIGURATION_UPDATED') {
        set_updating_api_configuration(undefined)
        set_updated_api_configuration(undefined)
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
    edit_api_configuration_save_handler
  }
}
