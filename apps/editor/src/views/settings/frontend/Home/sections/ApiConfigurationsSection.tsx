import { forwardRef } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Notice as UiNotice } from '@ui/components/editor/settings/Notice'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Button as UiButton } from '@ui/components/editor/common/Button'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { DefaultConfigurationSelector } from '@ui/components/editor/settings/DefaultConfigurationSelector'
import { ApiConfigurationForClient } from '@/views/settings/types/messages'
import { ToolType } from '@/views/settings/types/tools'
import { use_translation } from '../../i18n/use-translation'
import { NavItem } from '../Home'

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
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
  edit_context_instructions: string
  commit_instructions: string
  voice_input_instructions: string
  set_edit_context_instructions: (instructions: string) => void
  set_commit_instructions: (instructions: string) => void
  set_voice_input_instructions: (instructions: string) => void
  on_edit_context_instructions_blur: () => void
  on_commit_instructions_blur: () => void
  on_voice_input_instructions_blur: () => void
  default_edit_context_instructions: string
  default_commit_instructions: string
  default_voice_input_instructions: string
  on_restore_edit_context_instructions: () => void
  on_restore_commit_instructions: () => void
  on_restore_voice_input_instructions: () => void
}

export const ApiConfigurationsSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()

    return (
      <UiSection
        ref={ref}
        title={t('sections.api-configurations')}
        subtitle={t('configurations.subtitle')}
        actions={
          <UiButton on_click={() => props.on_add_api_configuration()}>
            {t('action.add-new')}
          </UiButton>
        }
      >
        <UiNotice type="info">{t('configurations.notice')}</UiNotice>
        {props.api_configurations.length == 0 && (
          <UiNotice type="warning">
            {t('configurations.notice.missing')}
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
                item_text: t('configurations.item'),
                items_text: t('configurations.items'),
                items_text_many: t('configurations.items-many')
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
                    title={t('configurations.action.insert')}
                    on_click={() =>
                      props.on_add_api_configuration({ insertion_index: index })
                    }
                  />
                  <IconButton
                    codicon_icon="files"
                    title={t('configurations.action.duplicate')}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_duplicate_api_configuration(api_configuration.id)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title={t('configurations.action.edit')}
                    on_click={() => props.on_edit_api_configuration(api_configuration.id)}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title={t('configurations.action.delete')}
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
        <div ref={(el) => props.set_section_ref('default-configurations', el)}>
          <UiGroup title={t('configurations.default-configurations.title')}>
              <DefaultConfigurationSelector
                title={t('configurations.tool.intelligent-update')}
                value={props.defaults['intelligent-update'] || null}
                configurations={props.api_configurations}
                on_unset={() =>
                  props.on_set_default_api_configuration('intelligent-update', null)
                }
                on_select={() =>
                  props.on_select_default_api_configuration('intelligent-update')
                }
                translations={{
                  select: t('configurations.action.select-default'),
                  unset: t('configurations.action.unset-default')
                }}
              />
              <DefaultConfigurationSelector
                title={t('configurations.tool.code-at-cursor')}
                value={props.defaults['code-at-cursor'] || null}
                configurations={props.api_configurations}
                on_unset={() =>
                  props.on_set_default_api_configuration('code-at-cursor', null)
                }
                on_select={() =>
                  props.on_select_default_api_configuration('code-at-cursor')
                }
                translations={{
                  select: t('configurations.action.select-default'),
                  unset: t('configurations.action.unset-default')
                }}
              />
              <DefaultConfigurationSelector
                title={t('configurations.tool.commit-messages')}
                value={props.defaults['commit-messages'] || null}
                configurations={props.api_configurations}
                on_unset={() =>
                  props.on_set_default_api_configuration('commit-messages', null)
                }
                on_select={() =>
                  props.on_select_default_api_configuration('commit-messages')
                }
                translations={{
                  select: t('configurations.action.select-default'),
                  unset: t('configurations.action.unset-default')
                }}
              />
              <DefaultConfigurationSelector
                title={t('configurations.tool.voice-input')}
                value={props.defaults['voice-input'] || null}
                configurations={props.api_configurations}
                on_unset={() =>
                  props.on_set_default_api_configuration('voice-input', null)
                }
                on_select={() =>
                  props.on_select_default_api_configuration('voice-input')
                }
                translations={{
                  select: t('configurations.action.select-default'),
                  unset: t('configurations.action.unset-default')
                }}
              />
          </UiGroup>
        </div>
        <div ref={(el) => props.set_section_ref('instructions', el)}>
          <UiGroup title={t('configurations.instructions.title')}>
            <UiItem
              title={t('configurations.edit-context-system-instructions.title')}
              description={t('configurations.edit-context-system-instructions.description')}
            >
              <UiTextarea
                value={props.edit_context_instructions}
                on_change={props.set_edit_context_instructions}
                on_blur={props.on_edit_context_instructions_blur}
                action_icon={
                  props.edit_context_instructions !== props.default_edit_context_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('configurations.action.restore-default')}
                on_action_click={props.on_restore_edit_context_instructions}
              />
            </UiItem>
            <UiItem
              title={t('configurations.commit-message-instructions.title')}
              description={t('configurations.commit-message-instructions.description')}
            >
              <UiTextarea
                value={props.commit_instructions}
                on_change={props.set_commit_instructions}
                on_blur={props.on_commit_instructions_blur}
                action_icon={
                  props.commit_instructions !== props.default_commit_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('configurations.action.restore-default')}
                on_action_click={props.on_restore_commit_instructions}
              />
            </UiItem>
            <UiItem
              title={t('configurations.voice-input-instructions.title')}
              description={t('configurations.voice-input-instructions.description')}
            >
              <UiTextarea
                value={props.voice_input_instructions}
                on_change={props.set_voice_input_instructions}
                on_blur={props.on_voice_input_instructions_blur}
                action_icon={
                  props.voice_input_instructions !== props.default_voice_input_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('configurations.action.restore-default')}
                on_action_click={props.on_restore_voice_input_instructions}
              />
            </UiItem>
          </UiGroup>
        </div>
      </UiSection>
    )
  }
)

ApiConfigurationsSection.displayName = 'ApiConfigurationsSection'
