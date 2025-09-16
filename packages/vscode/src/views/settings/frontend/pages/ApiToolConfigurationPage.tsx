import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient,
  FrontendMessage
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'
import { Page } from '@ui/components/editor/settings/Page'

type ToolName =
  | 'CODE_COMPLETIONS'
  | 'COMMIT_MESSAGES'
  | 'EDIT_CONTEXT'
  | 'INTELLIGENT_UPDATE'

type ToolConfigurationsPageProps = {
  vscode: any
  title: string
  subtitle: string
  tool_name: ToolName
  has_default: boolean
}

export const ApiToolConfigurationPage = (
  props: ToolConfigurationsPageProps
) => {
  const [configurations, set_configurations] = useState<
    ConfigurationForClient[]
  >([])
  const [is_fetching_configurations, set_is_fetching_configurations] =
    useState<boolean>(true)

  const listen_command = `${props.tool_name}_CONFIGURATIONS`
  const get_command = `GET_${props.tool_name}_CONFIGURATIONS`
  const add_command = `ADD_${props.tool_name}_CONFIGURATION`
  const reorder_command = `REORDER_${props.tool_name}_CONFIGURATIONS`
  const edit_command = `EDIT_${props.tool_name}_CONFIGURATION`
  const delete_command = `DELETE_${props.tool_name}_CONFIGURATION`
  const set_default_command = `SET_DEFAULT_${props.tool_name}_CONFIGURATION`

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == listen_command) {
        if ('configurations' in message) {
          set_configurations(message.configurations)
          set_is_fetching_configurations(false)
        }
      }
    }
    window.addEventListener('message', handle_message)

    set_is_fetching_configurations(true)
    post_message(props.vscode, { command: get_command } as FrontendMessage)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [props.vscode, props.tool_name])

  const on_set_default = props.has_default
    ? (configuration_id: string) => {
        post_message(props.vscode, {
          command: set_default_command,
          configuration_id
        } as FrontendMessage)
      }
    : undefined

  const on_unset_default = props.has_default
    ? () => {
        post_message(props.vscode, {
          command: set_default_command,
          configuration_id: null
        } as FrontendMessage)
      }
    : undefined

  return (
    <Page title={props.title} subtitle={props.subtitle}>
      {!is_fetching_configurations && (
        <ConfigurationsList
          configurations={configurations}
          on_add={() => {
            post_message(props.vscode, {
              command: add_command
            } as FrontendMessage)
          }}
          on_reorder={(reordered) => {
            set_configurations(reordered)
            post_message(props.vscode, {
              command: reorder_command,
              configurations: reordered
            } as FrontendMessage)
          }}
          on_edit={(configuration_id) => {
            post_message(props.vscode, {
              command: edit_command,
              configuration_id
            } as FrontendMessage)
          }}
          on_delete={(configuration_id) => {
            post_message(props.vscode, {
              command: delete_command,
              configuration_id
            } as FrontendMessage)
          }}
          on_set_default={on_set_default}
          on_unset_default={on_unset_default}
        />
      )}
    </Page>
  )
}
