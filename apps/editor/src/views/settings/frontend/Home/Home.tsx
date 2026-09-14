import { useState, useEffect } from 'react'
import { Layout as UiLayout } from '@ui/components/editor/settings/Layout'
import { use_scroll_to } from './hooks/use-scroll-to'
import { NavigationSection as UiNavigationSection } from '@ui/components/editor/settings/NavigationSection'
import { NavigationItemSection as UiNavigationItemSection } from '@ui/components/editor/settings/NavigationItemSection'
import { NavigationItemGroup as UiNavigationItemGroup } from '@ui/components/editor/settings/NavigationItemGroup'
import { ApiSection } from './sections/ApiSection'
import {
  ApiConfiguration,
  Provider,
  Template
} from '@/views/settings/types/messages'
import { WebConfiguration } from '@shared/types/web-configuration'
import { GeneralSection } from './sections/GeneralSection'
import { ApiFeature } from '@/views/shared/types/api-features'
import { use_translation, TranslationKey } from '../i18n/use-translation'
import { WebSection } from './sections/WebSection'
import { commit_message_instructions as default_commit_message_instructions } from '@/constants/instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'

export type NavItem =
  | 'section:general'
  | 'section:general:group:open-links'
  | 'section:general:group:prompt'
  | 'section:general:group:commits'
  | 'section:web'
  | 'section:web:group:chatbots'
  | 'section:api'
  | 'section:api:group:providers'
  | 'section:api:group:models'
  | 'section:api:group:api-defaults'
  | 'section:api:group:system-instructions'

export type NavConfigItem = { id: NavItem; label: TranslationKey }

export const NAV_ITEMS_CONFIG: NavConfigItem[] = [
  {
    id: 'section:general',
    label: 'sections.general'
  },
  {
    id: 'section:general:group:open-links',
    label: 'general.open-links.title'
  },
  {
    id: 'section:general:group:prompt',
    label: 'general.prompt.title'
  },
  {
    id: 'section:general:group:commits',
    label: 'general.commits.title'
  },
  {
    id: 'section:web',
    label: 'web.title'
  },
  {
    id: 'section:web:group:chatbots',
    label: 'chatbots.configurations.title'
  },
  {
    id: 'section:api',
    label: 'api.title'
  },
  {
    id: 'section:api:group:providers',
    label: 'api.providers.title'
  },
  {
    id: 'section:api:group:models',
    label: 'api.configurations.title'
  },
  {
    id: 'section:api:group:api-defaults',
    label: 'api.default-configurations.title'
  },
  {
    id: 'section:api:group:system-instructions',
    label: 'api.system-instructions.title'
  }
]

type Props = {
  providers: Provider[]
  api_configurations: ApiConfiguration[]
  web_configurations: WebConfiguration[]
  defaults: Record<ApiFeature, string | null>
  edit_files_system_instructions: string
  commit_message_instructions: string
  attach_ascii_tree_of_context: 'ask' | 'always' | 'never'
  use_context_files_in_commit_message_prompt: 'ask' | 'always' | 'never'
  select_all_prompts_in_commit_messages_by_default: boolean
  gemini_user_id: number | null
  ai_studio_user_id: number | null
  send_with_shift_enter: boolean
  templates: Record<string, Template[]>
  on_update_templates: (key: string, templates: Template[]) => void
  on_edit_template: (key: string, index: number) => void
  on_add_template: (
    key: string,
    params?: { insertion_index?: number; exact_insertion?: boolean }
  ) => void
  on_delete_template: (key: string, index: number) => void
  set_providers: (providers: Provider[]) => void
  set_api_configurations: (configurations: ApiConfiguration[]) => void
  set_web_configurations: (configurations: WebConfiguration[]) => void
  on_commit_instructions_change: (instructions: string) => void
  on_attach_ascii_tree_of_context_change: (
    value: 'ask' | 'always' | 'never'
  ) => void
  on_use_context_files_in_commit_message_prompt_change: (
    value: 'ask' | 'always' | 'never'
  ) => void
  on_select_all_prompts_in_commit_messages_by_default_change: (
    enabled: boolean
  ) => void
  on_edit_files_system_instructions_change: (instructions: string) => void
  on_gemini_user_id_change: (id: number | null) => void
  on_ai_studio_user_id_change: (id: number | null) => void
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_open_keybindings: (search?: string) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_add_provider: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_delete_provider: (provider_name: string) => void
  on_edit_provider: (provider_name: string) => void
  on_reorder_providers: (reordered_providers: Provider[]) => void
  on_set_default_api_configuration: (
    api_feature: ApiFeature,
    api_configuration_id: string | null
  ) => void
  on_select_default_api_configuration: (api_feature: ApiFeature) => void
  on_reorder_api_configurations: (reordered: ApiConfiguration[]) => void
  on_add_api_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_edit_api_configuration: (id: string) => void
  on_delete_api_configuration: (id: string) => void
  on_toggle_pinned_api_configuration: (config: ApiConfiguration) => void
  on_reorder_web_configurations: (reordered: WebConfiguration[]) => void
  on_add_web_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_edit_web_configuration: (id: string) => void
  on_delete_web_configuration: (name: string) => void
  on_toggle_pinned_web_configuration: (config: WebConfiguration) => void
  on_open_external_url: (url: string) => void
  scroll_to_section_on_load?: NavItem
}

export const Home: React.FC<Props> = (props) => {
  const { t } = use_translation()

  const {
    scroll_container_ref,
    set_section_ref,
    active_nav_item_id,
    active_parent_id,
    handle_nav_click
  } = use_scroll_to({
    nav_items_config: NAV_ITEMS_CONFIG,
    providers_length: props.providers.length,
    api_configurations_length: props.api_configurations.length,
    scroll_to_section_on_load: props.scroll_to_section_on_load
  })

  const [commit_instructions, set_commit_instructions] = useState('')
  const [edit_files_instructions, set_edit_files_instructions] = useState('')

  const get_has_warning = (id: NavItem): boolean => {
    if (id == 'section:api:group:models') {
      return props.api_configurations.length == 0
    } else if (id == 'section:web:group:chatbots') {
      return props.web_configurations.length == 0
    } else {
      return false
    }
  }

  useEffect(() => {
    set_commit_instructions(props.commit_message_instructions || '')
  }, [props.commit_message_instructions])

  useEffect(() => {
    set_edit_files_instructions(props.edit_files_system_instructions || '')
  }, [props.edit_files_system_instructions])

  return (
    <div style={{ height: '100vh' }}>
      <UiLayout
        ref={scroll_container_ref}
        title={t('sections.settings')}
        sidebar={(() => {
          const sections: {
            parent: NavConfigItem
            groups: NavConfigItem[]
          }[] = []

          for (const item of NAV_ITEMS_CONFIG) {
            if (
              item.id === 'section:api:group:providers' &&
              props.providers.length === 0
            ) {
              continue
            }
            if (
              [
                'section:api:group:api-defaults',
                'section:api:group:system-instructions'
              ].includes(item.id) &&
              props.api_configurations.length === 0
            ) {
              continue
            }
            if (
              item.id.startsWith('section:') &&
              !item.id.includes(':group:')
            ) {
              sections.push({ parent: item, groups: [] })
            } else if (sections.length > 0) {
              sections[sections.length - 1].groups.push(item)
            }
          }

          return sections.map((section, i) => {
            const is_section_active =
              section.parent.id === active_nav_item_id ||
              section.parent.id === active_parent_id

            return (
              <UiNavigationSection key={i} is_active={is_section_active}>
                <UiNavigationItemSection
                  label={t(section.parent.label)}
                  is_active={is_section_active}
                  has_warning={get_has_warning(section.parent.id)}
                />
                {section.groups.map((group, j) => (
                  <UiNavigationItemGroup
                    key={j}
                    href={`#${group.id}`}
                    label={t(group.label)}
                    is_active={group.id === active_nav_item_id}
                    has_warning={get_has_warning(group.id)}
                    on_click={(e) => handle_nav_click(e, group.id)}
                    is_last={j === section.groups.length - 1}
                  />
                ))}
              </UiNavigationSection>
            )
          })
        })()}
      >
        <GeneralSection
          ref={(el) => set_section_ref('section:general', el)}
          set_section_ref={set_section_ref}
          send_with_shift_enter={props.send_with_shift_enter}
          on_send_with_shift_enter_change={
            props.on_send_with_shift_enter_change
          }
          on_open_editor_settings={props.on_open_editor_settings}
          on_open_ignore_patterns_settings={
            props.on_open_ignore_patterns_settings
          }
          on_open_allow_patterns_settings={
            props.on_open_allow_patterns_settings
          }
          on_open_keybindings={props.on_open_keybindings}
          attach_ascii_tree_of_context={props.attach_ascii_tree_of_context}
          on_attach_ascii_tree_of_context_change={
            props.on_attach_ascii_tree_of_context_change
          }
          use_context_files_in_commit_message_prompt={
            props.use_context_files_in_commit_message_prompt
          }
          on_use_context_files_in_commit_message_prompt_change={
            props.on_use_context_files_in_commit_message_prompt_change
          }
          select_all_prompts_in_commit_messages_by_default={
            props.select_all_prompts_in_commit_messages_by_default
          }
          on_select_all_prompts_in_commit_messages_by_default_change={
            props.on_select_all_prompts_in_commit_messages_by_default_change
          }
          commit_instructions={commit_instructions}
          set_commit_instructions={set_commit_instructions}
          on_commit_instructions_blur={() => {
            props.on_commit_instructions_change(commit_instructions)
            if (
              commit_instructions == '' &&
              props.commit_message_instructions ==
                default_commit_message_instructions
            ) {
              set_commit_instructions(default_commit_message_instructions)
            }
          }}
          default_commit_instructions={default_commit_message_instructions}
          on_restore_commit_instructions={() => {
            set_commit_instructions(default_commit_message_instructions)
            props.on_commit_instructions_change(
              default_commit_message_instructions
            )
          }}
          on_open_external_url={props.on_open_external_url}
          templates={props.templates}
          on_update_templates={props.on_update_templates}
          on_edit_template={props.on_edit_template}
          on_add_template={props.on_add_template}
          on_delete_template={props.on_delete_template}
        />

        <WebSection
          ref={(el) => set_section_ref('section:web', el)}
          set_section_ref={set_section_ref}
          web_configurations={props.web_configurations}
          set_web_configurations={props.set_web_configurations}
          on_reorder_web_configurations={props.on_reorder_web_configurations}
          on_add_web_configuration={props.on_add_web_configuration}
          on_edit_web_configuration={props.on_edit_web_configuration}
          on_delete_web_configuration={props.on_delete_web_configuration}
          on_toggle_pinned_web_configuration={
            props.on_toggle_pinned_web_configuration
          }
          gemini_user_id={props.gemini_user_id}
          ai_studio_user_id={props.ai_studio_user_id}
          on_gemini_user_id_change={props.on_gemini_user_id_change}
          on_ai_studio_user_id_change={props.on_ai_studio_user_id_change}
        />

        <ApiSection
          ref={(el) => set_section_ref('section:api', el)}
          set_section_ref={set_section_ref}
          providers={props.providers}
          set_providers={props.set_providers}
          on_add_provider={props.on_add_provider}
          on_delete_provider={props.on_delete_provider}
          on_edit_provider={props.on_edit_provider}
          on_reorder_providers={props.on_reorder_providers}
          on_open_external_url={props.on_open_external_url}
          api_configurations={props.api_configurations}
          defaults={props.defaults}
          set_api_configurations={props.set_api_configurations}
          on_set_default_api_configuration={
            props.on_set_default_api_configuration
          }
          on_select_default_api_configuration={
            props.on_select_default_api_configuration
          }
          on_reorder_api_configurations={props.on_reorder_api_configurations}
          on_add_api_configuration={props.on_add_api_configuration}
          on_edit_api_configuration={props.on_edit_api_configuration}
          on_delete_api_configuration={props.on_delete_api_configuration}
          on_toggle_pinned_api_configuration={
            props.on_toggle_pinned_api_configuration
          }
          edit_files_instructions={edit_files_instructions}
          set_edit_files_instructions={set_edit_files_instructions}
          on_edit_files_instructions_blur={() => {
            props.on_edit_files_system_instructions_change(
              edit_files_instructions
            )
            if (
              edit_files_instructions == '' &&
              props.edit_files_system_instructions ==
                default_system_instructions
            ) {
              set_edit_files_instructions(default_system_instructions)
            }
          }}
          default_edit_files_instructions={default_system_instructions}
          on_restore_edit_files_instructions={() => {
            set_edit_files_instructions(default_system_instructions)
            props.on_edit_files_system_instructions_change(
              default_system_instructions
            )
          }}
        />
      </UiLayout>
    </div>
  )
}
