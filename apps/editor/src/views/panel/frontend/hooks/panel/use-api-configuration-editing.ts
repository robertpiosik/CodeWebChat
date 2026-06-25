import { useState, useEffect } from 'react'
import { ApiConfiguration, BackendMessage } from '../../../types/messages'
import { post_message } from '../../utils/post-message'
import { ToolType } from '@/views/settings/types/tools'

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
  const [api_configuration_tool_type, set_api_configuration_tool_type] =
    useState<ToolType | undefined>()

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
      tool_type: api_configuration_tool_type
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
        set_api_configuration_tool_type(undefined)
      } else if (message.command == 'START_API_CONFIGURATION_CREATION') {
        set_updating_api_configuration(message.api_configuration)
        set_updated_api_configuration(message.api_configuration)
        set_is_new_api_configuration(true)
        set_api_configuration_insertion_index(message.insertion_index)
        set_api_configuration_tool_type(message.tool_type)
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
