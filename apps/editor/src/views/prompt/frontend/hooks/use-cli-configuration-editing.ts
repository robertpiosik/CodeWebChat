import { useState, useEffect } from 'react'
import { CliConfiguration } from '@/types/cli-configuration'
import { BackendMessage } from '../../types/messages'
import { post_message } from '../utils/post-message'

export const use_cli_configuration_editing = (vscode: any) => {
  const [updating_cli_configuration, set_updating_cli_configuration] =
    useState<CliConfiguration>()
  const [updated_cli_configuration, set_updated_cli_configuration] =
    useState<CliConfiguration>()
  const [is_new_cli_configuration, set_is_new_cli_configuration] =
    useState(false)
  const [
    cli_configuration_insertion_index,
    set_cli_configuration_insertion_index
  ] = useState<number>()

  const edit_cli_configuration_back_click_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_CLI_CONFIGURATION',
      updating_cli_configuration: updating_cli_configuration!,
      updated_cli_configuration: updated_cli_configuration!,
      origin: 'cancel',
      is_new: is_new_cli_configuration
    })
  }

  const edit_cli_configuration_save_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_CLI_CONFIGURATION',
      updating_cli_configuration: updating_cli_configuration!,
      updated_cli_configuration: updated_cli_configuration!,
      origin: 'save',
      is_new: is_new_cli_configuration,
      insertion_index: cli_configuration_insertion_index
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'CLI_CONFIGURATION_UPDATED') {
        set_updating_cli_configuration(undefined)
        set_updated_cli_configuration(undefined)
        set_is_new_cli_configuration(false)
        set_cli_configuration_insertion_index(undefined)
      } else if (message.command == 'START_CLI_CONFIGURATION_CREATION') {
        const msg = message as any
        set_updating_cli_configuration(msg.cli_configuration)
        set_updated_cli_configuration(msg.cli_configuration)
        set_is_new_cli_configuration(true)
        set_cli_configuration_insertion_index(msg.insertion_index)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    updating_cli_configuration,
    set_updating_cli_configuration,
    set_updated_cli_configuration,
    edit_cli_configuration_back_click_handler,
    edit_cli_configuration_save_handler,
    set_is_new_cli_configuration,
    set_cli_configuration_insertion_index
  }
}