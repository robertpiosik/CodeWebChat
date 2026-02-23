import { ConfigurationForClient } from '@/views/settings/types/messages'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { Radio } from '@ui/components/editor/common/Radio'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { TextButton } from '@ui/components/editor/settings/TextButton'
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

  const has_default = configurations?.some((c) => c.is_default) ?? false

  return (
    <>
      {configurations && (
        <SortableList
          items={configurations}
          on_reorder={(reordered) => {
            set_configurations(reordered)
            props.on_reorder(reordered)
          }}
          on_add={props.on_add}
          translations={{
            add_title: t('settings.action.add-new'),
            insert_title: t('settings.action.insert-configuration'),
            item_text: t('settings.action.configuration'),
            items_text: t('settings.action.configurations'),
            items_text_many: t('settings.action.configurations-many')
          }}
          header_extra={
            props.on_unset_default && has_default ? (
              <>
                <span>·</span>
                <TextButton on_click={props.on_unset_default}>
                  {t('settings.action.unset-default')}
                </TextButton>
              </>
            ) : undefined
          }
          render_content={(config) => (
            <>
              {props.on_set_default && (
                <Radio
                  name={`default_configuration_${props.tool_name.toLowerCase()}`}
                  checked={!!config.is_default}
                  title={t('settings.action.set-default')}
                  on_change={() => props.on_set_default!(config.id)}
                />
              )}
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  cursor: props.on_set_default ? 'pointer' : undefined
                }}
                onClick={() => props.on_set_default?.(config.id)}
              >
                <span>{config.model}</span>
                <span
                  style={{
                    marginLeft: '0.5em',
                    opacity: 0.7,
                    fontSize: '0.9em'
                  }}
                >
                  {config.description}
                </span>
              </div>
            </>
          )}
          render_actions={(config) => (
            <>
              <IconButton
                codicon_icon="edit"
                title={t('settings.action.edit-configuration')}
                on_click={() => props.on_edit(config.id)}
              />
              <IconButton
                codicon_icon="trash"
                title={t('settings.action.delete-configuration')}
                on_click={(e) => {
                  e.stopPropagation()
                  props.on_delete(config.id)
                }}
              />
            </>
          )}
        />
      )}
    </>
  )
}
