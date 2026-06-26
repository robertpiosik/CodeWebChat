import { forwardRef } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Notice as UiNotice } from '@ui/components/editor/settings/Notice'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { DefaultConfigurationSelector } from '@ui/components/editor/settings/DefaultConfigurationSelector'
import { ApiConfiguration, Provider } from '@/views/settings/types/messages'
import { ToolType } from '@/views/settings/types/tools'
import { Translation, use_translation } from '../../i18n/use-translation'
import { ModelProvidersSection } from './ModelProvidersSection'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { NavItem } from '../Home'

type Props = {
  providers: Provider[]
  api_configurations: ApiConfiguration[]
  defaults: Record<ToolType, string | null>
  set_providers: (providers: Provider[]) => void
  set_api_configurations: (configurations: ApiConfiguration[]) => void
  on_reorder_providers: (reordered: Provider[]) => void
  on_add_provider: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_delete_provider: (provider_name: string) => void
  on_edit_provider: (provider_name: string) => void
  on_reorder_api_configurations: (reordered: ApiConfiguration[]) => void
  on_add_api_configuration: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_delete_api_configuration: (id: string) => void
  on_edit_api_configuration: (id: string) => void
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
  extended_cache_duration_for_anthropic: boolean
  on_extended_cache_duration_for_anthropic_change: (enabled: boolean) => void
  auto_run_intelligent_update: boolean
  on_auto_run_intelligent_update_change: (enabled: boolean) => void
  on_open_external_url: (url: string) => void
}

export const ApiConfigurationsSection = forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const { t } = use_translation()

    const selector_configurations = props.api_configurations.map((config) => {
      const details: string[] = [config.model_provider_name]
      if (config.reasoning_effort) {
        details.push(config.reasoning_effort)
      }

      return {
        id: config.id,
        model: config.model,
        description: details.join(' · ')
      }
    })

    return (
      <UiSection
        ref={ref}
        title={t('sections.api-configurations')}
        subtitle={t('configurations.subtitle')}
      >
        <UiGroup>
          <UiItem
            title={t('preferences.intelligent-update.auto-run.title')}
            description={t(
              'preferences.intelligent-update.auto-run.description'
            )}
            slot_right={
              <UiToggler
                is_on={props.auto_run_intelligent_update}
                on_toggle={props.on_auto_run_intelligent_update_change}
              />
            }
          />
        </UiGroup>

        <div ref={(el) => props.set_section_ref('model-providers', el)}>
          <UiGroup
            title={t('sections.model-providers')}
            notices_slot={
              <>
                <UiNotice type="info">
                  <Translation
                    id="model-providers.notice.credentials"
                    components={{
                      link: (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            props.on_open_external_url(
                              'https://code.visualstudio.com/api/references/vscode-api#SecretStorage'
                            )
                          }}
                        >
                          SecretStorage
                        </a>
                      )
                    }}
                  />
                </UiNotice>

                {!props.providers.length && (
                  <UiNotice type="warning">
                    {t('model-providers.notice.missing')}
                  </UiNotice>
                )}
              </>
            }
          >
            <ModelProvidersSection
              providers={props.providers}
              on_reorder={(reordered) => {
                props.set_providers(reordered)
                props.on_reorder_providers(reordered)
              }}
              on_add_provider={props.on_add_provider}
              on_delete_provider={props.on_delete_provider}
              on_edit_provider={props.on_edit_provider}
            />
            <UiItem
              title={t('model-providers.extended-cache.anthropic.title')}
              description={
                <Translation
                  id="model-providers.extended-cache.anthropic.description"
                  components={{
                    link: (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          props.on_open_external_url(
                            'https://platform.claude.com/docs/en/build-with-claude/prompt-caching'
                          )
                        }}
                      >
                        {t(
                          'model-providers.extended-cache.anthropic.learn-more'
                        )}
                      </a>
                    )
                  }}
                />
              }
              slot_right={
                <UiToggler
                  is_on={props.extended_cache_duration_for_anthropic}
                  on_toggle={
                    props.on_extended_cache_duration_for_anthropic_change
                  }
                />
              }
            />
          </UiGroup>
        </div>

        <div ref={(el) => props.set_section_ref('api-configurations', el)}>
          <UiGroup
            title={t('web-configurations.configurations.title')}
            notices_slot={
              !props.api_configurations.length ? (
                <UiNotice type="warning">
                  {t('configurations.notice.missing')}
                </UiNotice>
              ) : undefined
            }
          >
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
                  item_text: t('web-configurations.item'),
                  items_text: t('web-configurations.items'),
                  items_text_many: t('web-configurations.items-many')
                }}
                render_content={(config) => {
                  const details: string[] = [config.model_provider_name]
                  if (config.reasoning_effort) {
                    details.push(config.reasoning_effort)
                  }
                  if (config.temperature !== undefined) {
                    details.push(`T: ${config.temperature}`)
                  }

                  return (
                    <div
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      <span>{config.model}</span>
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
                  )
                }}
                render_actions={(config, index) => (
                  <>
                    <IconButton
                      codicon_icon="insert"
                      title={t('web-configurations.action.insert')}
                      on_click={() =>
                        props.on_add_api_configuration({
                          insertion_index: index
                        })
                      }
                    />
                    <IconButton
                      codicon_icon="edit"
                      title={t('web-configurations.action.edit')}
                      on_click={() =>
                        props.on_edit_api_configuration(config.id)
                      }
                    />
                    <IconButton
                      codicon_icon="trash"
                      title={t('web-configurations.action.delete')}
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_delete_api_configuration(config.id)
                      }}
                    />
                  </>
                )}
              />
            )}
            {props.api_configurations.length > 0 && (
              <>
                <DefaultConfigurationSelector
                  title={t('configurations.tool.intelligent-update')}
                  value={props.defaults['intelligent-update'] || null}
                  configurations={selector_configurations}
                  on_unset={() =>
                    props.on_set_default_api_configuration(
                      'intelligent-update',
                      null
                    )
                  }
                  on_select={() =>
                    props.on_select_default_api_configuration(
                      'intelligent-update'
                    )
                  }
                  translations={{
                    select: t('configurations.action.select-default'),
                    unset: t('configurations.action.unset-default')
                  }}
                />
                <DefaultConfigurationSelector
                  title={t('configurations.tool.code-at-cursor')}
                  value={props.defaults['code-at-cursor'] || null}
                  configurations={selector_configurations}
                  on_unset={() =>
                    props.on_set_default_api_configuration(
                      'code-at-cursor',
                      null
                    )
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
                  configurations={selector_configurations}
                  on_unset={() =>
                    props.on_set_default_api_configuration(
                      'commit-messages',
                      null
                    )
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
                  configurations={selector_configurations}
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
              </>
            )}
          </UiGroup>
        </div>
        <div ref={(el) => props.set_section_ref('instructions', el)}>
          <UiGroup title={t('configurations.instructions.title')}>
            <UiItem
              title={t('configurations.edit-context-system-instructions.title')}
              description={t(
                'configurations.edit-context-system-instructions.description'
              )}
            >
              <UiTextarea
                value={props.edit_context_instructions}
                on_change={props.set_edit_context_instructions}
                on_blur={props.on_edit_context_instructions_blur}
                action_icon={
                  props.edit_context_instructions !==
                  props.default_edit_context_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('configurations.action.restore-default')}
                on_action_click={props.on_restore_edit_context_instructions}
              />
            </UiItem>
            <UiItem
              title={t('configurations.commit-message-instructions.title')}
              description={t(
                'configurations.commit-message-instructions.description'
              )}
            >
              <UiTextarea
                value={props.commit_instructions}
                on_change={props.set_commit_instructions}
                on_blur={props.on_commit_instructions_blur}
                action_icon={
                  props.commit_instructions !==
                  props.default_commit_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('configurations.action.restore-default')}
                on_action_click={props.on_restore_commit_instructions}
              />
            </UiItem>
            <UiItem
              title={t('configurations.voice-input-instructions.title')}
              description={t(
                'configurations.voice-input-instructions.description'
              )}
            >
              <UiTextarea
                value={props.voice_input_instructions}
                on_change={props.set_voice_input_instructions}
                on_blur={props.on_voice_input_instructions_blur}
                action_icon={
                  props.voice_input_instructions !==
                  props.default_voice_input_instructions
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
