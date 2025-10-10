import { ConfigurationForClient } from '@/views/settings/types/messages'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'

type ToolName =
  | 'CODE_COMPLETIONS'
  | 'COMMIT_MESSAGES'
  | 'EDIT_CONTEXT'
  | 'INTELLIGENT_UPDATE'

type ToolConfigurationsSectionProps = {
  tool_name: ToolName
  can_have_default: boolean
  configurations: ConfigurationForClient[] | undefined
  set_configurations: (configurations: ConfigurationForClient[]) => void
  on_add: () => void
  on_reorder: (reordered: ConfigurationForClient[]) => void
  on_edit: (configuration_id: string) => void
  on_delete: (configuration_id: string) => void
  on_set_default?: (configuration_id: string) => void
  on_unset_default?: () => void
}

export const ApiToolConfigurationSection: React.FC<
  ToolConfigurationsSectionProps
> = (props) => {
  const { configurations, set_configurations } = props

  return (
    <>
      {configurations && (
        <ConfigurationsList
          configurations={configurations}
          on_add={props.on_add}
          on_reorder={(reordered) => {
            set_configurations(reordered)
            props.on_reorder(reordered)
          }}
          on_edit={props.on_edit}
          on_delete={props.on_delete}
          on_set_default={props.on_set_default}
          on_unset_default={props.on_unset_default}
        />
      )}
    </>
  )
}
