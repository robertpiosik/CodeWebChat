import { forwardRef } from 'react'
import { Section as UiSection } from '@ui/components/editor/settings/Section'
import { Group as UiGroup } from '@ui/components/editor/settings/Group/Group'
import { Notices as UiNotices } from '@ui/components/editor/settings/Notices'
import { Item as UiItem } from '@ui/components/editor/settings/Item'
import { Button } from '@ui/components/editor/common/Button'
import { DefaultConfigurationSelector } from '@ui/components/editor/settings/DefaultConfigurationSelector'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { ApiConfiguration, Provider } from '@/views/settings/types/messages'
import { ApiFeature } from '@/views/shared/types/api-features'
import { Translation, use_translation } from '../../i18n/use-translation'
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
    exact_insertion?: boolean
  }) => void
  on_delete_provider: (provider_name: string) => void
  on_edit_provider: (provider_name: string) => void
  on_reorder_api_configurations: (reordered: ApiConfiguration[]) => void
  on_add_api_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_delete_api_configuration: (id: string) => void
  on_edit_api_configuration: (id: string) => void
  on_toggle_pinned_api_configuration: (config: ApiConfiguration) => void
  on_set_default_api_configuration: (
    api_feature: ApiFeature,
    api_configuration_id: string | null
  ) => void
  on_select_default_api_configuration: (api_feature: ApiFeature) => void
  set_section_ref: (id: NavItem, el: HTMLDivElement | null) => void
  edit_files_instructions: string
  set_edit_files_instructions: (instructions: string) => void
  on_edit_files_instructions_blur: () => void
  default_edit_files_instructions: string
  on_restore_edit_files_instructions: () => void
}

export const ApiSection = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { t } = use_translation()

  const selector_configurations = props.api_configurations.map((config) => {
    const details: string[] = [config.provider_name]
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
    <UiSection ref={ref} title={t('api.title')} subtitle={t('api.subtitle')}>
      <UiNotices
        notices={[
          {
            type: 'info',
            message: (
              <Translation
                id="api.notice.credentials"
                components={{
                  link: (
                    <a href="https://code.visualstudio.com/api/references/vscode-api#SecretStorage">
                      SecretStorage
                    </a>
                  )
                }}
              />
            )
          }
        ]}
      />
      <div
        ref={(el) => props.set_section_ref('section:api:group:providers', el)}
      >
        <UiGroup
          title={t('api.providers.title')}
          notice_slot={
            !props.providers.length ? (
              <UiNotices
                notices={[
                  {
                    type: 'warning',
                    slot_right: (
                      <Button on_click={() => props.on_add_provider()}>
                        {t('action.add-new')}
                      </Button>
                    ),
                    message: t('api.providers.missing-provider')
                  }
                ]}
              />
            ) : null
          }
        >
          {props.providers.length > 0 && (
            <SortableList
              items={props.providers.map((p) => ({ ...p, id: p.name }))}
              on_reorder={(reordered) => {
                const reordered_providers = reordered.map(
                  ({ id: _id, ...rest }) => rest as Provider
                )
                props.set_providers(reordered_providers)
                props.on_reorder_providers(reordered_providers)
              }}
              on_add={props.on_add_provider}
              translations={{
                add_title: t('action.add-new'),
                item_text: t('api.providers.item'),
                items_text: t('api.providers.items')
              }}
              render_content={(provider) => {
                const is_localhost =
                  provider.base_url.includes('localhost') ||
                  provider.base_url.includes('127.0.0.1')

                return (
                  <>
                    <div
                      style={{
                        width: 90,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {provider.name}
                    </div>
                    <div
                      style={{
                        width: 50,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {is_localhost || !provider.api_key_mask
                        ? '⠀⠀—'
                        : provider.api_key_mask}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {provider.base_url}
                    </div>
                  </>
                )
              }}
              render_actions={(provider, index) => {
                return (
                  <>
                    <IconButton
                      codicon_icon="insert"
                      title={t('action.insert')}
                      on_click={() =>
                        props.on_add_provider({ insertion_index: index })
                      }
                    />
                    <IconButton
                      codicon_icon="edit"
                      title={t('api.providers.action.edit')}
                      on_click={() => props.on_edit_provider(provider.name)}
                    />
                    <IconButton
                      codicon_icon="trash"
                      title={t('api.providers.action.delete')}
                      on_click={() => props.on_delete_provider(provider.name)}
                    />
                  </>
                )
              }}
            />
          )}
        </UiGroup>
      </div>

      <div ref={(el) => props.set_section_ref('section:api:group:models', el)}>
        <UiGroup
          title={t('api.configurations.title')}
          is_disabled={props.providers.length === 0}
          notice_slot={
            !props.api_configurations.length ? (
              <UiNotices
                notices={[
                  {
                    type: 'warning',
                    slot_right: (
                      <Button on_click={() => props.on_add_api_configuration()}>
                        {t('action.add-new')}
                      </Button>
                    ),
                    message: t('api.configurations.missing-model')
                  }
                ]}
              />
            ) : null
          }
        >
          {props.api_configurations.length > 0 && (
            <SortableList
              items={props.api_configurations}
              on_reorder={(reordered) => {
                props.set_api_configurations(reordered)
                props.on_reorder_api_configurations(reordered)
              }}
              on_add={props.on_add_api_configuration}
              translations={{
                add_title: t('action.add-new'),
                item_text: t('api.configurations.item'),
                items_text: t('api.configurations.items'),
                items_text_many: t('api.configurations.items-many')
              }}
              render_content={(config) => {
                const details: string[] = [config.provider_name]
                if (config.reasoning_effort) {
                  details.push(config.reasoning_effort)
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
                    codicon_icon={config.is_pinned ? 'pinned' : 'pin'}
                    title={
                      config.is_pinned ? t('action.unpin') : t('action.pin')
                    }
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_toggle_pinned_api_configuration(config)
                    }}
                  />
                  <IconButton
                    codicon_icon="insert"
                    title={t('action.insert')}
                    on_click={() =>
                      props.on_add_api_configuration({
                        insertion_index: index
                      })
                    }
                  />
                  <IconButton
                    codicon_icon="edit"
                    title={t('api.configurations.action.edit')}
                    on_click={() => props.on_edit_api_configuration(config.id)}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title={t('api.configurations.action.delete')}
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
          props.set_section_ref('section:api:group:api-defaults', el)
        }
      >
        <UiGroup
          title={t('api.default-configurations.title')}
          is_disabled={props.api_configurations.length === 0}
        >
          <DefaultConfigurationSelector
            title={t('api.default-configurations.tool.patch-repair')}
            value={props.defaults['patch-repair'] || null}
            configurations={selector_configurations}
            on_unset={() =>
              props.on_set_default_api_configuration('patch-repair', null)
            }
            on_select={() =>
              props.on_select_default_api_configuration('patch-repair')
            }
            translations={{
              select: t('api.configurations.action.select-default'),
              unset: t('api.configurations.action.unset-default')
            }}
          />
          <DefaultConfigurationSelector
            title={t('api.default-configurations.tool.code-at-cursor')}
            value={props.defaults['code-at-cursor'] || null}
            configurations={selector_configurations}
            on_unset={() =>
              props.on_set_default_api_configuration('code-at-cursor', null)
            }
            on_select={() =>
              props.on_select_default_api_configuration('code-at-cursor')
            }
            translations={{
              select: t('api.configurations.action.select-default'),
              unset: t('api.configurations.action.unset-default')
            }}
          />

          <DefaultConfigurationSelector
            title={t('api.default-configurations.tool.voice-input')}
            value={props.defaults['voice-input'] || null}
            configurations={selector_configurations}
            on_unset={() =>
              props.on_set_default_api_configuration('voice-input', null)
            }
            on_select={() =>
              props.on_select_default_api_configuration('voice-input')
            }
            translations={{
              select: t('api.configurations.action.select-default'),
              unset: t('api.configurations.action.unset-default')
            }}
          />
        </UiGroup>
      </div>

      <div
        ref={(el) =>
          props.set_section_ref('section:api:group:system-instructions', el)
        }
      >
        <UiGroup
          title={t('api.system-instructions.title')}
          is_disabled={props.api_configurations.length === 0}
        >
          <UiItem
            title={t('api.system-instructions.edit-files.title')}
            description={t('api.system-instructions.edit-files.description')}
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
})

ApiSection.displayName = 'ApiSection'
