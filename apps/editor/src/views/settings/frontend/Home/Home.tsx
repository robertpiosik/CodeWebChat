import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Layout as UiLayout } from '@ui/components/editor/settings/Layout'
import { NavigationSection as UiNavigationSection } from '@ui/components/editor/settings/NavigationSection'
import { NavigationItemSection as UiNavigationItemSection } from '@ui/components/editor/settings/NavigationItemSection'
import { NavigationItemGroup as UiNavigationItemGroup } from '@ui/components/editor/settings/NavigationItemGroup'
import { ApiConfigurationsSection } from './sections/ApiConfigurationsSection'
import {
  ApiConfiguration,
  Provider,
  Template
} from '@/views/settings/types/messages'
import { WebConfiguration } from '@shared/types/web-configuration'
import { GeneralSection } from './sections/GeneralSection'
import { ApiFeature } from '@/views/shared/types/api-features'
import { use_translation, TranslationKey } from '../i18n/use-translation'
import { WebConfigurationsSection } from './sections/WebConfigurationsSection'
import { commit_message_instructions as default_commit_message_instructions } from '@/constants/instructions'
import { ai_file_search_task_instructions as default_intelligent_file_search_instructions } from '@/constants/instructions'
import { ai_file_search_task_instructions as default_agentic_file_search_instructions } from '@/constants/instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { GROUP_TITLE_HEIGHT, SECTION_HEADER_HEIGHT } from '@ui/constants/sizes'

export type NavItem =
  | 'section:general'
  | 'section:general:group:open-links'
  | 'section:general:group:context'
  | 'section:general:group:prompt-field'
  | 'section:general:group:history'
  | 'section:general:group:commit-messages'
  | 'section:web'
  | 'section:web:group:web-configurations'
  | 'section:web:group:chatbots-other'
  | 'section:api'
  | 'section:api:group:model-providers'
  | 'section:api:group:api-configurations'
  | 'section:api:group:api-defaults'
  | 'section:api:group:api-behavior'
  | 'section:api:group:system-instructions'

type NavConfigItem = { id: NavItem; label: TranslationKey }

const NAV_ITEMS_CONFIG: NavConfigItem[] = [
  {
    id: 'section:general',
    label: 'sections.general'
  },
  {
    id: 'section:general:group:open-links',
    label: 'general.open-links.title'
  },
  {
    id: 'section:general:group:context',
    label: 'general.context.title'
  },
  {
    id: 'section:general:group:prompt-field',
    label: 'general.prompt-field.title'
  },
  {
    id: 'section:general:group:history',
    label: 'general.history.title'
  },
  {
    id: 'section:general:group:commit-messages',
    label: 'general.commit-messages.title'
  },
  {
    id: 'section:web',
    label: 'web.title'
  },
  {
    id: 'section:web:group:web-configurations',
    label: 'chatbots.configurations.title'
  },
  {
    id: 'section:web:group:chatbots-other',
    label: 'chatbots.behavior.title'
  },
  {
    id: 'section:api',
    label: 'api.title'
  },
  {
    id: 'section:api:group:model-providers',
    label: 'api-calls.model-providers.title'
  },
  {
    id: 'section:api:group:api-configurations',
    label: 'api-calls.configurations.title'
  },
  {
    id: 'section:api:group:api-defaults',
    label: 'api-calls.default-configurations.title'
  },
  {
    id: 'section:api:group:api-behavior',
    label: 'api-calls.behavior.title'
  },
  {
    id: 'section:api:group:system-instructions',
    label: 'api-calls.system-instructions.title'
  }
]

type Props = {
  providers: Provider[]
  api_configurations: ApiConfiguration[]
  web_configurations: WebConfiguration[]
  defaults: Record<ApiFeature, string | null>
  edit_files_system_instructions: string
  intelligent_file_search_instructions: string
  agentic_file_search_instructions: string
  commit_message_instructions: string
  synchronize_edit_format_between_targets: boolean
  attach_ascii_tree_of_context: 'ask' | 'always' | 'never'
  use_context_files_in_commit_message_prompt: 'ask' | 'always' | 'never'
  select_all_prompts_in_commit_messages_by_default: boolean
  gemini_user_id: number | null
  ai_studio_user_id: number | null
  send_with_shift_enter: boolean
  reuse_last_tab: boolean
  are_automatic_checkpoints_disabled: boolean
  checkpoint_lifespan: number
  clear_checks_in_workspace_behavior: 'ignore-open-editors' | 'uncheck-all'
  auto_run_intelligent_update: boolean
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
  on_synchronize_edit_format_between_targets_change: (enabled: boolean) => void
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
  on_intelligent_file_search_instructions_change: (instructions: string) => void
  on_agentic_file_search_instructions_change: (instructions: string) => void
  on_automatic_checkpoints_toggle: (disabled: boolean) => void
  on_checkpoint_lifespan_change: (hours: number | undefined) => void
  on_gemini_user_id_change: (id: number | null) => void
  on_ai_studio_user_id_change: (id: number | null) => void
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_reuse_last_tab_change: (enabled: boolean) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: 'ignore-open-editors' | 'uncheck-all'
  ) => void
  on_auto_run_intelligent_update_change: (enabled: boolean) => void
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

  const scroll_container_ref = useRef<HTMLDivElement>(null)
  const section_refs = useRef<Record<NavItem, HTMLDivElement | null>>({
    'section:general': null,
    'section:general:group:open-links': null,
    'section:general:group:context': null,
    'section:general:group:prompt-field': null,
    'section:general:group:history': null,
    'section:general:group:commit-messages': null,
    'section:web': null,
    'section:web:group:web-configurations': null,
    'section:web:group:chatbots-other': null,
    'section:api': null,
    'section:api:group:model-providers': null,
    'section:api:group:api-configurations': null,
    'section:api:group:api-defaults': null,
    'section:api:group:api-behavior': null,
    'section:api:group:system-instructions': null
  })

  const set_section_ref = useCallback(
    (id: NavItem, el: HTMLDivElement | null) => {
      section_refs.current[id] = el
    },
    []
  )

  const [commit_instructions, set_commit_instructions] = useState('')
  const [
    intelligent_file_search_instructions,
    set_intelligent_file_search_instructions
  ] = useState('')
  const [
    agentic_file_search_instructions,
    set_agentic_file_search_instructions
  ] = useState('')
  const [edit_files_instructions, set_edit_files_instructions] = useState('')

  const get_has_warning = (id: NavItem): boolean => {
    if (id == 'section:api:group:api-configurations') {
      return props.api_configurations.length == 0
    } else if (id == 'section:web:group:web-configurations') {
      return props.web_configurations.length == 0
    } else {
      return false
    }
  }

  const [active_nav_item_id, set_active_nav_item_id] = useState<NavItem>(
    NAV_ITEMS_CONFIG[0].id
  )

  const last_rendered_item_id = useMemo(() => {
    let last_id = NAV_ITEMS_CONFIG[0].id
    for (const item of NAV_ITEMS_CONFIG) {
      if (
        item.id === 'section:api:group:model-providers' &&
        props.providers.length === 0
      ) {
        continue
      }
      if (
        item.id === 'section:web:group:chatbots-other' &&
        props.web_configurations.length === 0
      ) {
        continue
      }
      if (
        [
          'section:api:group:api-defaults',
          'section:api:group:api-behavior',
          'section:api:group:system-instructions'
        ].includes(item.id) &&
        props.api_configurations.length === 0
      ) {
        continue
      }
      last_id = item.id
    }
    return last_id
  }, [
    props.providers.length,
    props.web_configurations.length,
    props.api_configurations.length
  ])

  useEffect(() => {
    const scroll_container = scroll_container_ref.current
    const el = section_refs.current[last_rendered_item_id]
    if (!scroll_container || !el) return

    let last_el_content_height = 0
    let last_container_height = 0

    const update = () => {
      if (last_el_content_height && last_container_height) {
        const is_subsection = NAV_ITEMS_CONFIG.find(
          (i) => i.id === last_rendered_item_id
        )?.id.includes(':group:')
        const target_y = is_subsection ? SECTION_HEADER_HEIGHT : 0
        const required = Math.max(
          0,
          last_container_height - target_y - last_el_content_height
        )
        el.style.paddingBottom = `${required}px`
      }
    }

    const observer = new ResizeObserver((entries) => {
      let changed = false
      for (const entry of entries) {
        if (entry.target === el) {
          last_el_content_height = entry.contentRect.height
          changed = true
        } else if (entry.target === scroll_container) {
          last_container_height = entry.contentRect.height
          changed = true
        }
      }
      if (changed) update()
    })

    observer.observe(scroll_container)
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (el) el.style.paddingBottom = ''
    }
  }, [last_rendered_item_id])

  const active_parent_id = useMemo(() => {
    let current_parent: NavItem | null = null
    for (const item of NAV_ITEMS_CONFIG) {
      if (item.id.startsWith('section:') && !item.id.includes(':group:')) {
        current_parent = item.id
      }
      if (item.id === active_nav_item_id) {
        return item.id.includes(':group:') ? current_parent : null
      }
    }
    return null
  }, [active_nav_item_id])

  useEffect(() => {
    const scroll_container = scroll_container_ref.current
    if (!scroll_container) return

    const handle_scroll = () => {
      const container_rect = scroll_container.getBoundingClientRect()
      let new_active_id = NAV_ITEMS_CONFIG[0].id

      for (const item of NAV_ITEMS_CONFIG) {
        if (
          item.id === 'section:api:group:model-providers' &&
          props.providers.length === 0
        ) {
          continue
        }
        if (
          item.id === 'section:web:group:chatbots-other' &&
          props.web_configurations.length === 0
        ) {
          continue
        }
        if (
          [
            'section:api:group:api-defaults',
            'section:api:group:api-behavior',
            'section:api:group:system-instructions'
          ].includes(item.id) &&
          props.api_configurations.length === 0
        ) {
          continue
        }
        const el = section_refs.current[item.id]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (
            rect.top <=
            container_rect.top + SECTION_HEADER_HEIGHT + GROUP_TITLE_HEIGHT
          ) {
            new_active_id = item.id
          }
        }
      }
      set_active_nav_item_id(new_active_id)
    }

    scroll_container.addEventListener('scroll', handle_scroll)
    window.addEventListener('resize', handle_scroll)
    setTimeout(handle_scroll, 50)

    return () => {
      scroll_container.removeEventListener('scroll', handle_scroll)
      window.removeEventListener('resize', handle_scroll)
    }
  }, [
    props.providers.length,
    props.web_configurations.length,
    props.api_configurations.length
  ])

  useEffect(() => {
    set_commit_instructions(props.commit_message_instructions || '')
  }, [props.commit_message_instructions])

  useEffect(() => {
    set_intelligent_file_search_instructions(
      props.intelligent_file_search_instructions || ''
    )
  }, [props.intelligent_file_search_instructions])

  useEffect(() => {
    set_agentic_file_search_instructions(
      props.agentic_file_search_instructions || ''
    )
  }, [props.agentic_file_search_instructions])

  useEffect(() => {
    set_edit_files_instructions(props.edit_files_system_instructions || '')
  }, [props.edit_files_system_instructions])

  const handle_scroll_to_section = (item_id: NavItem) => {
    const section = section_refs.current[item_id]
    const scroll_container = scroll_container_ref.current

    if (section && scroll_container) {
      const container_rect = scroll_container.getBoundingClientRect()
      const section_rect = section.getBoundingClientRect()

      const offset = section_rect.top - container_rect.top

      let extra_offset = 0
      const is_subsection = NAV_ITEMS_CONFIG.find(
        (i) => i.id == item_id
      )?.id.includes(':group:')
      if (is_subsection) {
        extra_offset = -SECTION_HEADER_HEIGHT
      }

      const target_scroll_top =
        scroll_container.scrollTop + offset + extra_offset

      scroll_container.scrollTo({
        top: target_scroll_top,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    if (props.scroll_to_section_on_load) {
      handle_scroll_to_section(props.scroll_to_section_on_load)
    }
  }, [props.scroll_to_section_on_load])

  const handle_nav_click = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item_id: NavItem
  ) => {
    e.preventDefault()
    handle_scroll_to_section(item_id)
  }

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
              item.id === 'section:api:group:model-providers' &&
              props.providers.length === 0
            ) {
              continue
            }
            if (
              item.id === 'section:web:group:chatbots-other' &&
              props.web_configurations.length === 0
            ) {
              continue
            }
            if (
              [
                'section:api:group:api-defaults',
                'section:api:group:api-behavior',
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
          synchronize_edit_format_between_targets={
            props.synchronize_edit_format_between_targets
          }
          on_synchronize_edit_format_between_targets_change={
            props.on_synchronize_edit_format_between_targets_change
          }
          send_with_shift_enter={props.send_with_shift_enter}
          on_send_with_shift_enter_change={
            props.on_send_with_shift_enter_change
          }
          clear_checks_in_workspace_behavior={
            props.clear_checks_in_workspace_behavior
          }
          on_clear_checks_in_workspace_behavior_change={
            props.on_clear_checks_in_workspace_behavior_change
          }
          are_automatic_checkpoints_disabled={
            props.are_automatic_checkpoints_disabled
          }
          on_automatic_checkpoints_toggle={
            props.on_automatic_checkpoints_toggle
          }
          checkpoint_lifespan={props.checkpoint_lifespan}
          on_checkpoint_lifespan_change={props.on_checkpoint_lifespan_change}
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
          intelligent_file_search_instructions={
            intelligent_file_search_instructions
          }
          set_intelligent_file_search_instructions={
            set_intelligent_file_search_instructions
          }
          on_intelligent_file_search_instructions_blur={() => {
            props.on_intelligent_file_search_instructions_change(
              intelligent_file_search_instructions
            )
            if (
              intelligent_file_search_instructions == '' &&
              props.intelligent_file_search_instructions ==
                default_intelligent_file_search_instructions
            ) {
              set_intelligent_file_search_instructions(
                default_intelligent_file_search_instructions
              )
            }
          }}
          default_intelligent_file_search_instructions={
            default_intelligent_file_search_instructions
          }
          on_restore_intelligent_file_search_instructions={() => {
            set_intelligent_file_search_instructions(
              default_intelligent_file_search_instructions
            )
            props.on_intelligent_file_search_instructions_change(
              default_intelligent_file_search_instructions
            )
          }}
          agentic_file_search_instructions={
            agentic_file_search_instructions
          }
          set_agentic_file_search_instructions={
            set_agentic_file_search_instructions
          }
          on_agentic_file_search_instructions_blur={() => {
            props.on_agentic_file_search_instructions_change(
              agentic_file_search_instructions
            )
            if (
              agentic_file_search_instructions == '' &&
              props.agentic_file_search_instructions ==
                default_agentic_file_search_instructions
            ) {
              set_agentic_file_search_instructions(
                default_agentic_file_search_instructions
              )
            }
          }}
          default_agentic_file_search_instructions={
            default_agentic_file_search_instructions
          }
          on_restore_agentic_file_search_instructions={() => {
            set_agentic_file_search_instructions(
              default_agentic_file_search_instructions
            )
            props.on_agentic_file_search_instructions_change(
              default_agentic_file_search_instructions
            )
          }}
          on_open_external_url={props.on_open_external_url}
          templates={props.templates}
          on_update_templates={props.on_update_templates}
          on_edit_template={props.on_edit_template}
          on_add_template={props.on_add_template}
          on_delete_template={props.on_delete_template}
        />

        <WebConfigurationsSection
          ref={(el) => set_section_ref('section:web', el)}
          set_section_ref={set_section_ref}
          web_configurations={props.web_configurations}
          set_web_configurations={props.set_web_configurations}
          on_reorder_web_configurations={props.on_reorder_web_configurations}
          on_add_web_configuration={props.on_add_web_configuration}
          on_edit_web_configuration={props.on_edit_web_configuration}
          on_delete_web_configuration={props.on_delete_web_configuration}
          on_toggle_pinned_web_configuration={props.on_toggle_pinned_web_configuration}
          reuse_last_tab={props.reuse_last_tab}
          on_reuse_last_tab_change={props.on_reuse_last_tab_change}
          gemini_user_id={props.gemini_user_id}
          ai_studio_user_id={props.ai_studio_user_id}
          on_gemini_user_id_change={props.on_gemini_user_id_change}
          on_ai_studio_user_id_change={props.on_ai_studio_user_id_change}
        />

        <ApiConfigurationsSection
          ref={(el) => set_section_ref('section:api', el)}
          set_section_ref={set_section_ref}
          providers={props.providers}
          set_providers={props.set_providers}
          on_add_provider={props.on_add_provider}
          on_delete_provider={props.on_delete_provider}
          on_edit_provider={props.on_edit_provider}
          on_reorder_providers={props.on_reorder_providers}
          auto_run_intelligent_update={props.auto_run_intelligent_update}
          on_auto_run_intelligent_update_change={
            props.on_auto_run_intelligent_update_change
          }
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
          on_toggle_pinned_api_configuration={props.on_toggle_pinned_api_configuration}
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
