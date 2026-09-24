import { useState, useEffect } from 'react'
import { CliConfiguration } from '@/types/cli-configuration'
import { BackendMessage } from '../../types/messages'
import { post_message } from '../utils/post-message'

export const use_agent_configuration_editing = (vscode: any) => {
  const [updating_agent_configuration, set_updating_agent_configuration] =
    useState<CliConfiguration>()
  const [updated_agent_configuration, set_updated_agent_configuration] =
    useState<CliConfiguration>()
  const [is_new_agent_configuration, set_is_new_agent_configuration] =
    useState(false)
  const [
    agent_configuration_insertion_index,
    set_agent_configuration_insertion_index
  ] = useState<number>()

  useEffect(() => {
    set_updated_agent_configuration(updating_agent_configuration)
  }, [updating_agent_configuration])

  const edit_agent_configuration_cancel_handler = () => {
    if (updated_agent_configuration) {
      post_message(vscode, {
        command: 'UPDATE_AGENT_CONFIGURATION',
        updating_agent_configuration: updating_agent_configuration!,
        updated_agent_configuration: updated_agent_configuration,
        origin: 'cancel',
        is_new: is_new_agent_configuration
      })
    } else {
      set_updating_agent_configuration(undefined)
    }
  }

  const edit_agent_configuration_save_handler = () => {
    if (updated_agent_configuration) {
      post_message(vscode, {
        command: 'UPDATE_AGENT_CONFIGURATION',
        updating_agent_configuration: updating_agent_configuration!,
        updated_agent_configuration: updated_agent_configuration,
        origin: 'save',
        is_new: is_new_agent_configuration,
        insertion_index: agent_configuration_insertion_index
      })
    }
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'AGENT_CONFIGURATION_UPDATED') {
        set_updating_agent_configuration(undefined)
        set_updated_agent_configuration(undefined)
        set_is_new_agent_configuration(false)
        set_agent_configuration_insertion_index(undefined)
      } else if (message.command == 'START_AGENT_CONFIGURATION_CREATION') {
        const msg = message as any
        set_updating_agent_configuration(msg.agent_configuration)
        set_updated_agent_configuration(msg.agent_configuration)
        set_is_new_agent_configuration(true)
        set_agent_configuration_insertion_index(msg.insertion_index)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    updating_agent_configuration,
    set_updating_agent_configuration,
    set_updated_agent_configuration,
    edit_agent_configuration_cancel_handler,
    edit_agent_configuration_save_handler,
    set_is_new_agent_configuration,
    set_agent_configuration_insertion_index
  }
}