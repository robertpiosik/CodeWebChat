import { ConfigurationForClient } from '@/views/settings/types/messages'
import { FrontendMessage } from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'

type ToolName =
  | 'CODE_COMPLETIONS'
  | 'COMMIT_MESSAGES'
  | 'EDIT_CONTEXT'
  | 'INTELLIGENT_UPDATE'

type ToolConfigurationsSectionProps = {
  vscode: any
  tool_name: ToolName
  can_have_default: boolean
  configurations: ConfigurationForClient[] | undefined
  set_configurations: (configurations: ConfigurationForClient[]) => void
}

export const ApiToolConfigurationSection: React.FC<
  ToolConfigurationsSectionProps
> = (props) => {
  const { configurations, set_configurations } = props

  const add_command = `ADD_${props.tool_name}_CONFIGURATION`
  const reorder_command = `REORDER_${props.tool_name}_CONFIGURATIONS`
  const edit_command = `EDIT_${props.tool_name}_CONFIGURATION`
  const delete_command = `DELETE_${props.tool_name}_CONFIGURATION`
  const set_default_command = `SET_DEFAULT_${props.tool_name}_CONFIGURATION`

  const handle_set_default = props.can_have_default
    ? (configuration_id: string) => {
        post_message(props.vscode, {
          command: set_default_command,
          configuration_id
        } as FrontendMessage)
      }
    : undefined

  const handle_unset_default = props.can_have_default
    ? () => {
        post_message(props.vscode, {
          command: set_default_command,
          configuration_id: null
        } as FrontendMessage)
      }
    : undefined

  return (
    <>
      {configurations && (
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
          on_set_default={handle_set_default}
          on_unset_default={handle_unset_default}
        />
      )}
    </>
  )
}
