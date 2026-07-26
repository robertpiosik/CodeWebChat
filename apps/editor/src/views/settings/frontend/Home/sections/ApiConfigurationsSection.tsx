import { forwardRef } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Notice as UiNotice } from '@ui/components/editor/settings/Notice'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Toggler as UiToggler } from '@ui/components/editor/common/Toggler'
import { DefaultConfigurationSelector } from '@ui/components/editor/settings/DefaultConfigurationSelector'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { ApiConfiguration, Provider } from '@/views/settings/types/messages'
import { ApiFeature } from '@/views/shared/types/api-features'
import { Translation, use_translation } from '../../i18n/use-translation'
import { ModelProvidersSection } from './ModelProvidersSection'
import { SortableList } from '@ui/components/editor/settings/SortableList'
import { IconButton } from '@ui/components/editor/common/IconButton'
import { NavItem } from '../Home'

type Props = {
  providers: Provider[]
  api_configurations: ApiConfiguration[]
  defaults: Record<ApiFeature, string | null>
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
    api_feature: ApiFeature,
    api_configuration_id: string | null
  ) => void
  on_select_default_api_configuration: (api_feature: ApiFeature) => void
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
  auto_run_intelligent_update: boolean
  on_auto_run_intelligent_update_change: (enabled: boolean) => void
  on_open_external_url: (url: string) => void
  edit_files_instructions: string
  set_edit_files_instructions: (instructions: string) => void
  on_edit_files_instructions_blur: () => void
  default_edit_files_instructions: string
  on_restore_edit_files_instructions: () => void
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
        title={t('api-calls.title')}
        subtitle={t('api-calls.configurations.subtitle')}
      >
        <UiNotice type="info">
          <Translation
            id="api-calls.model-providers.notice.credentials"
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
        <div
          ref={(el) =>
            props.set_section_ref('section:api-calls:group:model-providers', el)
          }
        >
          <UiGroup
            title={t('api-calls.model-providers.title')}
            notice_slot={
              !props.providers.length ? (
                <UiNotice type="warning">
                  {t('api-calls.model-providers.notice.missing')}
                </UiNotice>
              ) : null
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
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref(
              'section:api-calls:group:api-configurations',
              el
            )
          }
        >
          <UiGroup
            title={t('api-calls.configurations.title')}
            notice_slot={
              !props.api_configurations.length ? (
                <UiNotice type="warning">
                  {t('api-calls.configurations.notice.missing')}
                </UiNotice>
              ) : null
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
                  item_text: t('api-calls.configurations.item'),
                  items_text: t('api-calls.configurations.items'),
                  items_text_many: t('api-calls.configurations.items-many')
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
                      title={t('api-calls.configurations.action.insert')}
                      on_click={() =>
                        props.on_add_api_configuration({
                          insertion_index: index
                        })
                      }
                    />
                    <IconButton
                      codicon_icon="edit"
                      title={t('api-calls.configurations.action.edit')}
                      on_click={() =>
                        props.on_edit_api_configuration(config.id)
                      }
                    />
                    <IconButton
                      codicon_icon="trash"
                      title={t('api-calls.configurations.action.delete')}
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_delete_api_configuration(config.id)
                      }}
                    />
                  </>
                )}
              />
            )}
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:api-calls:group:api-defaults', el)
          }
        >
          <UiGroup
            title={t('api-calls.configurations.default-configurations.title')}
          >
            <DefaultConfigurationSelector
              title={t('api-calls.configurations.tool.intelligent-update')}
              value={props.defaults['intelligent-update'] || null}
              configurations={selector_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration(
                  'intelligent-update',
                  null
                )
              }
              on_select={() =>
                props.on_select_default_api_configuration('intelligent-update')
              }
              translations={{
                select: t('api-calls.configurations.action.select-default'),
                unset: t('api-calls.configurations.action.unset-default')
              }}
            />
            <DefaultConfigurationSelector
              title={t('api-calls.configurations.tool.code-at-cursor')}
              value={props.defaults['code-at-cursor'] || null}
              configurations={selector_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('code-at-cursor', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('code-at-cursor')
              }
              translations={{
                select: t('api-calls.configurations.action.select-default'),
                unset: t('api-calls.configurations.action.unset-default')
              }}
            />
            <DefaultConfigurationSelector
              title={t('api-calls.configurations.tool.commit-messages')}
              value={props.defaults['commit-messages'] || null}
              configurations={selector_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('commit-messages', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('commit-messages')
              }
              translations={{
                select: t('api-calls.configurations.action.select-default'),
                unset: t('api-calls.configurations.action.unset-default')
              }}
            />
            <DefaultConfigurationSelector
              title={t('api-calls.configurations.tool.find-relevant-files')}
              value={props.defaults['find-relevant-files'] || null}
              configurations={selector_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration(
                  'find-relevant-files',
                  null
                )
              }
              on_select={() =>
                props.on_select_default_api_configuration('find-relevant-files')
              }
              translations={{
                select: t('api-calls.configurations.action.select-default'),
                unset: t('api-calls.configurations.action.unset-default')
              }}
            />

            <DefaultConfigurationSelector
              title={t('api-calls.configurations.tool.voice-input')}
              value={props.defaults['voice-input'] || null}
              configurations={selector_configurations}
              on_unset={() =>
                props.on_set_default_api_configuration('voice-input', null)
              }
              on_select={() =>
                props.on_select_default_api_configuration('voice-input')
              }
              translations={{
                select: t('api-calls.configurations.action.select-default'),
                unset: t('api-calls.configurations.action.unset-default')
              }}
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref('section:api-calls:group:api-behavior', el)
          }
        >
          <UiGroup title={t('api-calls.configurations.behavior.title')}>
            <UiItem
              title={t(
                'api-calls.configurations.intelligent-update.auto-run.title'
              )}
              description={t(
                'api-calls.configurations.intelligent-update.auto-run.description'
              )}
              slot_right={
                <UiToggler
                  is_on={props.auto_run_intelligent_update}
                  on_toggle={props.on_auto_run_intelligent_update_change}
                />
              }
            />
          </UiGroup>
        </div>

        <div
          ref={(el) =>
            props.set_section_ref(
              'section:api-calls:group:system-instructions',
              el
            )
          }
        >
          <UiGroup
            title={t('api-calls.configurations.system-instructions.title')}
            is_last
          >
            <UiItem
              title={t(
                'api-calls.configurations.edit-files-system-instructions.title'
              )}
              description={t(
                'api-calls.configurations.edit-files-system-instructions.description'
              )}
              is_toggleable
              translations={{
                expand: t('common.expand'),
                collapse: t('common.collapse')
              }}
            >
              <UiTextarea
                value={props.edit_files_instructions}
                min_rows={3}
                on_change={props.set_edit_files_instructions}
                on_blur={props.on_edit_files_instructions_blur}
                action_icon={
                  props.edit_files_instructions !==
                  props.default_edit_files_instructions
                    ? 'discard'
                    : undefined
                }
                action_title={t('general.action.restore-default')}
                on_action_click={props.on_restore_edit_files_instructions}
              />
            </UiItem>
          </UiGroup>
        </div>
      </UiSection>
    )
  }
)

ApiConfigurationsSection.displayName = 'ApiConfigurationsSection'
