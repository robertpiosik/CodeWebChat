import { forwardRef } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { CliConfiguration } from '@/types/cli-configuration'
import { use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'

type Props = {
  agent_configurations: CliConfiguration[]
  set_agent_configurations: (configurations: CliConfiguration[]) => void
  on_reorder_agent_configurations: (reordered: CliConfiguration[]) => void
  on_add_agent_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_edit_agent_configuration: (id: string) => void
  on_delete_agent_configuration: (name: string) => void
  on_toggle_pinned_agent_configuration: (config: CliConfiguration) => void
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
}

export const CliSection = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { t } = use_translation()

  return (
    <UiSection ref={ref} title={t('cli.title')} subtitle={t('cli.subtitle')}>
      <div
        ref={(el) => props.set_section_ref('section:cli:group:agents', el)}
      >
        <UiGroup title={t('agents.configurations.title')}>
          <SortableList
            items={props.agent_configurations.map((c, index) => ({
              ...c,
              id: c.name ?? `unnamed-${index}`
            }))}
            on_reorder={(reordered) => {
              const restored = reordered.map(
                ({ id: _id, ...rest }) => rest as CliConfiguration
              )
              props.set_agent_configurations(restored)
              props.on_reorder_agent_configurations(restored)
            }}
            on_add={props.on_add_agent_configuration}
            translations={{
              add_title: t('action.add-new'),
              item_text: t('agents.configurations.item'),
              items_text: t('agents.configurations.items'),
              items_text_many: t('agents.configurations.items-many')
            }}
            render_content={(config) => {
              const is_unnamed =
                !config.name ||
                config.name.startsWith('unnamed-') ||
                /^\(\d+\)$/.test(config.name.trim())
              const display_name = is_unnamed
                ? config.agent!
                : config.name!.replace(/ \(\d+\)$/, '')

              const details: string[] = []
              if (is_unnamed) {
                // ...
              } else if (config.agent) {
                details.push(config.agent)
              }

              if (config.flags) {
                details.push(config.flags)
              }

              return (
                <>
                  <div
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <span>{display_name}</span>
                    {details.length > 0 && (
                      <span
                        style={{
                          marginLeft: '0.5em',
                          opacity: 0.7,
                          fontSize: '0.9em'
                        }}
                      >
                        {details.join(' · ')}
                      </span>
                    )}
                  </div>
                </>
              )
            }}
            render_actions={(config, index) => (
              <>
                <IconButton
                  codicon_icon={config.is_pinned ? 'pinned' : 'pin'}
                  title={config.is_pinned ? t('action.unpin') : t('action.pin')}
                  on_click={(e) => {
                    e.stopPropagation()
                    props.on_toggle_pinned_agent_configuration(config)
                  }}
                />
                <IconButton
                  codicon_icon="insert"
                  title={t('action.insert')}
                  on_click={() =>
                    props.on_add_agent_configuration({
                      insertion_index: index
                    })
                  }
                />
                <IconButton
                  codicon_icon="edit"
                  title={t('agents.configurations.action.edit')}
                  on_click={() => props.on_edit_agent_configuration(config.id)}
                />
                <IconButton
                  codicon_icon="trash"
                  title={t('agents.configurations.action.delete')}
                  on_click={(e) => {
                    e.stopPropagation()
                    props.on_delete_agent_configuration(config.id)
                  }}
                />
              </>
            )}
          />
        </UiGroup>
      </div>
    </UiSection>
  )
})

CliSection.displayName = 'CliSection'