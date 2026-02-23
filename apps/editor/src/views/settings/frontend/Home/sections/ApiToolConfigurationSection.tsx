import { ConfigurationForClient } from '@/views/settings/types/messages'
import { ConfigurationsList as UiConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'
import { use_translation } from '@/views/i18n/use-translation'

type ToolName =
  | 'CODE_AT_CURSOR'
  | 'COMMIT_MESSAGES'
  | 'EDIT_CONTEXT'
  | 'INTELLIGENT_UPDATE'
  | 'PRUNE_CONTEXT'
  | 'VOICE_INPUT'

type ToolConfigurationsSectionProps = {
  tool_name: ToolName
  can_have_default: boolean
  configurations: ConfigurationForClient[] | undefined
  set_configurations: (configurations: ConfigurationForClient[]) => void
  on_add: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
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
  const { t } = use_translation()

  return (
    <>
      {configurations && (
        <UiConfigurationsList
          translations={{
            add_title: t('settings.action.add-new'),
            insert_title: t('settings.action.insert-configuration'),
            edit_title: t('settings.action.edit-configuration'),
            delete_title: t('settings.action.delete-configuration'),
            set_default_title: t('settings.action.set-default'),
            unset_default_text: t('settings.action.unset-default'),
            configuration_text: t('settings.action.configuration'),
            configurations_text: t('settings.action.configurations')
          }}
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
          radio_group_name={`default_configuration_${props.tool_name.toLowerCase()}`}
        />
      )}
    </>
  )
}
