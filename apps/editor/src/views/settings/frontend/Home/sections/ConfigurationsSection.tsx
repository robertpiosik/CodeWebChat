import { forwardRef } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Notice as UiNotice } from '@ui/components/editor/settings/Notice'
import { Button as UiButton } from '@ui/components/editor/common/Button'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { DefaultConfigurationSelector } from '@ui/components/editor/settings/DefaultConfigurationSelector'
import { ApiConfigurationForClient } from '@/views/settings/types/messages'
import { ToolType } from '@/views/settings/types/tools'
import { use_translation } from '../../i18n/use-translation'

type Props = {
  api_configurations: ApiConfigurationForClient[]
  defaults: Record<ToolType, string | null>
  set_api_configurations: (configurations: ApiConfigurationForClient[]) => void
  on_reorder_api_configurations: (reordered: ApiConfigurationForClient[]) => void
  on_add_api_configuration: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_duplicate_api_configuration: (api_configuration_id: string) => void
  on_edit_api_configuration: (api_configuration_id: string) => void
  on_delete_api_configuration: (api_configuration_id: string) => void
  on_set_default_api_configuration: (
    tool_name: ToolType,
    api_configuration_id: string | null
  ) => void
  on_select_default_api_configuration: (tool_name: ToolType) => void
  on_stuck_change: (is_stuck: boolean) => void
}

export const ConfigurationsSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()

    return (
      <UiSection
        ref={ref}
        title={t('sidebar.configurations')}
        subtitle={t('configurations.subtitle')}
        on_stuck_change={props.on_stuck_change}
        actions={
          <UiButton on_click={() => props.on_add_api_configuration()}>
            {t('action.add-new')}
          </UiButton>
        }
      >
        <UiNotice type="info">{t('configurations.notice')}</UiNotice>
        {props.api_configurations.length == 0 && (
          <UiNotice type="warning">
            {t('message.missing-configuration')}
          </UiNotice>
        )}
        <UiGroup>
          {props.api_configurations && (
            <SortableList
              items={props.api_configurations}
              on_reorder={(reordered) => {
                props.set_api_configurations(reordered)
                props.on_reorder_api_configurations(reordered)
              }}
              on_add={props.on_add_api_configuration}
              translations={{
                add_title: t('action.add-new'),
                item_text: t('action.configuration'),
                items_text: t('action.configurations'),
                items_text_many: t('action.configurations-many')
              }}
              render_content={(api_configuration) => (
                <div
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <span>{api_configuration.model}</span>
                  <span
                    style={{
                      marginLeft: '0.5em',
                      opacity: 0.7,
                      fontSize: '0.9em'
                    }}
                  >
                    {api_configuration.description}
                  </span>
                </div>
              )}
              render_actions={(api_configuration, index) => (
                <>
                  <IconButton
                    codicon_icon="insert"
                    title={t('action.insert-configuration')}
                    on_click={() =>
                      props.on_add_api_configuration({ insertion_index: index })
                    }
                  />
                  <IconButton
                    codicon_icon="files"
                    title={t('action.duplicate-configuration')}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_duplicate_api_configuration(api_configuration.id)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title={t('action.edit-configuration')}
                    on_click={() => props.on_edit_api_configuration(api_configuration.id)}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title={t('action.delete-configuration')}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_delete_api_configuration(api_configuration.id)
                    }}
                  />
                </>
              )}
            />
          )}
        </UiGroup>
        <UiGroup title={t('action.default-configurations')}>
            <DefaultConfigurationSelector
              title={t('sidebar.intelligent-update')}
              value={props.defaults['intelligent-update'] || null}
              configurations={props.api_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('intelligent-update', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('intelligent-update')
              }
              translations={{
                select: t('action.select'),
                unset: t('action.unset')
              }}
            />
            <DefaultConfigurationSelector
              title={t('sidebar.code-at-cursor')}
              value={props.defaults['code-at-cursor'] || null}
              configurations={props.api_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('code-at-cursor', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('code-at-cursor')
              }
              translations={{
                select: t('action.select'),
                unset: t('action.unset')
              }}
            />
            <DefaultConfigurationSelector
              title={t('sidebar.commit-messages')}
              value={props.defaults['commit-messages'] || null}
              configurations={props.api_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('commit-messages', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('commit-messages')
              }
              translations={{
                select: t('action.select'),
                unset: t('action.unset')
              }}
            />
            <DefaultConfigurationSelector
              title={t('sidebar.voice-input')}
              value={props.defaults['voice-input'] || null}
              configurations={props.api_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('voice-input', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('voice-input')
              }
              translations={{
                select: t('action.select'),
                unset: t('action.unset')
              }}
            />
        </UiGroup>
      </UiSection>
    )
  }
)

ConfigurationsSection.displayName = 'ConfigurationsSection'
