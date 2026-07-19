import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Layout as UiLayout } from '@ui/components/editor/settings/Layout'
import { NavigationItemSection as UiNavigationItemSection } from '@ui/components/editor/settings/NavigationItemSection'
import { NavigationItemGroup as UiNavigationItemGroup } from '@ui/components/editor/settings/NavigationItemGroup'
import { ApiConfigurationsSection } from './sections/ApiConfigurationsSection'
import {
  ApiConfiguration,
  Provider,
  EditFormatInstructions
} from '@/views/settings/types/messages'
import { WebConfiguration } from '@shared/types/web-configuration'
import { GeneralSection } from './sections/GeneralSection'
import { ApiFeature } from '@/views/shared/types/api-features'
import { use_translation, TranslationKey } from '../i18n/use-translation'
import { WebConfigurationsSection } from './sections/WebConfigurationsSection'
import { commit_message_instructions as default_commit_message_instructions } from '@/constants/instructions'
import { find_relevant_files_instructions as default_find_relevant_files_instructions } from '@/constants/instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { GROUP_TITLE_HEIGHT, SECTION_HEADER_HEIGHT } from '@ui/constants/sizes'

export type NavItem =
  | 'section:general'
  | 'section:general:group:open-links'
  | 'section:general:group:context'
  | 'section:general:group:prompt-field'
  | 'section:general:group:history'
  | 'section:general:group:commit-messages'
  | 'section:general:group:edit-format'
  | 'section:chatbots'
  | 'section:chatbots:group:web-configurations'
  | 'section:chatbots:group:chatbots-other'
  | 'section:api-calls'
  | 'section:api-calls:group:model-providers'
  | 'section:api-calls:group:api-configurations'
  | 'section:api-calls:group:api-defaults'
  | 'section:api-calls:group:api-behavior'
  | 'section:api-calls:group:system-instructions'

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
    id: 'section:general:group:edit-format',
    label: 'general.edit-formats.title'
  },
  {
    id: 'section:chatbots',
    label: 'chatbots.title'
  },
  {
    id: 'section:chatbots:group:web-configurations',
    label: 'chatbots.configurations.title'
  },
  {
    id: 'section:chatbots:group:chatbots-other',
    label: 'chatbots.behavior.title'
  },
  {
    id: 'section:api-calls',
    label: 'api-calls.title'
  },
  {
    id: 'section:api-calls:group:model-providers',
    label: 'api-calls.model-providers.title'
  },
  {
    id: 'section:api-calls:group:api-configurations',
    label: 'api-calls.configurations.title'
  },
  {
    id: 'section:api-calls:group:api-defaults',
    label: 'api-calls.configurations.default-configurations.title'
  },
  {
    id: 'section:api-calls:group:api-behavior',
    label: 'api-calls.configurations.behavior.title'
  },
  {
    id: 'section:api-calls:group:system-instructions',
    label: 'api-calls.configurations.system-instructions.title'
  }
]

type Props = {
  providers: Provider[]
  api_configurations: ApiConfiguration[]
  web_configurations: WebConfiguration[]
  defaults: Record<ApiFeature, string | null>
  edit_files_system_instructions: string
  find_relevant_files_instructions: string
  commit_message_instructions: string
  select_all_prompts_in_commit_messages_by_default: boolean
  context_size_warning_threshold: number
  gemini_user_id: number | null
  ai_studio_user_id: number | null
  send_with_shift_enter: boolean
  check_new_files: boolean
  reuse_last_tab: boolean
  are_automatic_checkpoints_disabled: boolean
  checkpoint_lifespan: number
  edit_format_instructions: EditFormatInstructions
  clear_checks_in_workspace_behavior: 'ignore-open-editors' | 'uncheck-all'
  copy_paths_format: 'list' | 'tree'
  auto_run_intelligent_update: boolean
  set_providers: (providers: Provider[]) => void
  set_api_configurations: (configurations: ApiConfiguration[]) => void
  set_web_configurations: (configurations: WebConfiguration[]) => void
  on_context_size_warning_threshold_change: (
    threshold: number | undefined
  ) => void
  on_commit_instructions_change: (instructions: string) => void
  on_select_all_prompts_in_commit_messages_by_default_change: (
    enabled: boolean
  ) => void
  on_edit_format_instructions_change: (
    instructions: EditFormatInstructions
  ) => void
  on_edit_files_system_instructions_change: (instructions: string) => void
  on_find_relevant_files_instructions_change: (instructions: string) => void
  on_automatic_checkpoints_toggle: (disabled: boolean) => void
  on_checkpoint_lifespan_change: (hours: number | undefined) => void
  on_gemini_user_id_change: (id: number | null) => void
  on_ai_studio_user_id_change: (id: number | null) => void
  on_send_with_shift_enter_change: (enabled: boolean) => void
  on_check_new_files_change: (enabled: boolean) => void
  on_reuse_last_tab_change: (enabled: boolean) => void
  on_clear_checks_in_workspace_behavior_change: (
    value: 'ignore-open-editors' | 'uncheck-all'
  ) => void
  on_copy_paths_format_change: (value: 'list' | 'tree') => void
  on_auto_run_intelligent_update_change: (enabled: boolean) => void
  on_open_keybindings: (search?: string) => void
  on_open_editor_settings: () => void
  on_open_ignore_patterns_settings: () => void
  on_open_allow_patterns_settings: () => void
  on_add_provider: (params?: {
    insertion_index?: number
    create_on_top?: boolean
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
    create_on_top?: boolean
  }) => void
  on_edit_api_configuration: (id: string) => void
  on_delete_api_configuration: (id: string) => void
  on_reorder_web_configurations: (reordered: WebConfiguration[]) => void
  on_add_web_configuration: (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => void
  on_edit_web_configuration: (id: string) => void
  on_delete_web_configuration: (name: string) => void
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
    'section:general:group:edit-format': null,
    'section:chatbots': null,
    'section:chatbots:group:web-configurations': null,
    'section:chatbots:group:chatbots-other': null,
    'section:api-calls': null,
    'section:api-calls:group:model-providers': null,
    'section:api-calls:group:api-configurations': null,
    'section:api-calls:group:api-defaults': null,
    'section:api-calls:group:api-behavior': null,
    'section:api-calls:group:system-instructions': null
  })

  const set_section_ref = useCallback(
    (id: NavItem, el: HTMLDivElement | null) => {
      section_refs.current[id] = el
    },
    []
  )

  const [commit_instructions, set_commit_instructions] = useState('')
  const [find_relevant_instructions, set_find_relevant_instructions] =
    useState('')
  const [edit_files_instructions, set_edit_files_instructions] = useState('')

  const get_has_warning = (id: NavItem): boolean => {
    if (id == 'section:api-calls:group:model-providers') {
      return props.providers.length == 0
    } else if (id == 'section:api-calls:group:api-configurations') {
      return props.api_configurations.length == 0
    } else if (id == 'section:chatbots:group:web-configurations') {
      return props.web_configurations.length == 0
    } else {
      return false
    }
  }

  const [active_nav_item_id, set_active_nav_item_id] = useState<NavItem>(
    NAV_ITEMS_CONFIG[0].id
  )

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
  }, [])

  useEffect(() => {
    set_commit_instructions(props.commit_message_instructions || '')
  }, [props.commit_message_instructions])

  useEffect(() => {
    set_find_relevant_instructions(props.find_relevant_files_instructions || '')
  }, [props.find_relevant_files_instructions])

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
        sidebar={NAV_ITEMS_CONFIG.map((item, i) => {
          let current_parent: NavItem | null = null
          for (let j = i; j >= 0; j--) {
            if (
              NAV_ITEMS_CONFIG[j].id.startsWith('section:') &&
              !NAV_ITEMS_CONFIG[j].id.includes(':group:')
            ) {
              current_parent = NAV_ITEMS_CONFIG[j].id
              break
            }
          }
          const is_parent_active =
            current_parent === active_nav_item_id ||
            current_parent === active_parent_id

          if (item.id.includes(':group:')) {
            return (
              <UiNavigationItemGroup
                key={i}
                href={`#${item.id}`}
                label={t(item.label)}
                is_active={item.id == active_nav_item_id}
                is_parent_active={is_parent_active}
                has_warning={get_has_warning(item.id)}
                on_click={(e) => handle_nav_click(e, item.id)}
                is_last={!NAV_ITEMS_CONFIG[i + 1]?.id.includes(':group:')}
              />
            )
          }

          return (
            <UiNavigationItemSection
              key={i}
              label={t(item.label)}
              is_active={
                item.id == active_nav_item_id || item.id == active_parent_id
              }
              has_warning={get_has_warning(item.id)}
            />
          )
        })}
      >
        <GeneralSection
          ref={(el) => set_section_ref('section:general', el)}
          set_section_ref={set_section_ref}
          context_size_warning_threshold={props.context_size_warning_threshold}
          on_context_size_warning_threshold_change={
            props.on_context_size_warning_threshold_change
          }
          send_with_shift_enter={props.send_with_shift_enter}
          on_send_with_shift_enter_change={
            props.on_send_with_shift_enter_change
          }
          check_new_files={props.check_new_files}
          on_check_new_files_change={props.on_check_new_files_change}
          clear_checks_in_workspace_behavior={
            props.clear_checks_in_workspace_behavior
          }
          copy_paths_format={props.copy_paths_format}
          on_copy_paths_format_change={props.on_copy_paths_format_change}
          on_clear_checks_in_workspace_behavior_change={
            props.on_clear_checks_in_workspace_behavior_change
          }
          edit_format_instructions={props.edit_format_instructions}
          on_edit_format_instructions_change={
            props.on_edit_format_instructions_change
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
          find_relevant_instructions={find_relevant_instructions}
          set_find_relevant_instructions={set_find_relevant_instructions}
          on_find_relevant_instructions_blur={() => {
            props.on_find_relevant_files_instructions_change(
              find_relevant_instructions
            )
            if (
              find_relevant_instructions == '' &&
              props.find_relevant_files_instructions ==
                default_find_relevant_files_instructions
            ) {
              set_find_relevant_instructions(
                default_find_relevant_files_instructions
              )
            }
          }}
          default_find_relevant_instructions={
            default_find_relevant_files_instructions
          }
          on_restore_find_relevant_instructions={() => {
            set_find_relevant_instructions(
              default_find_relevant_files_instructions
            )
            props.on_find_relevant_files_instructions_change(
              default_find_relevant_files_instructions
            )
          }}
        />

        <WebConfigurationsSection
          ref={(el) => set_section_ref('section:chatbots', el)}
          set_section_ref={set_section_ref}
          web_configurations={props.web_configurations}
          set_web_configurations={props.set_web_configurations}
          on_reorder_web_configurations={props.on_reorder_web_configurations}
          on_add_web_configuration={props.on_add_web_configuration}
          on_edit_web_configuration={props.on_edit_web_configuration}
          on_delete_web_configuration={props.on_delete_web_configuration}
          reuse_last_tab={props.reuse_last_tab}
          on_reuse_last_tab_change={props.on_reuse_last_tab_change}
          gemini_user_id={props.gemini_user_id}
          ai_studio_user_id={props.ai_studio_user_id}
          on_gemini_user_id_change={props.on_gemini_user_id_change}
          on_ai_studio_user_id_change={props.on_ai_studio_user_id_change}
        />

        <ApiConfigurationsSection
          ref={(el) => set_section_ref('section:api-calls', el)}
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
