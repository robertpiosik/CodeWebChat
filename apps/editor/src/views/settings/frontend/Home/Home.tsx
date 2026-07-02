import { useState, useRef, useEffect, useCallback } from 'react'
import { Layout as UiLayout } from '@ui/components/editor/settings/Layout'
import { NavigationItem as UiNavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ApiConfigurationsSection } from './sections/ApiConfigurationsSection'
import {
  ApiConfiguration,
  Provider,
  EditFormatInstructions
} from '@/views/settings/types/messages'
import { WebConfiguration } from '@shared/types/web-configuration'
import { PreferencesSection } from './sections/PreferencesSection'
import { ToolType } from '@/views/settings/types/tools'
import { use_translation, TranslationKey } from '../i18n/use-translation'
import { WebConfigurationsSection } from './sections/WebConfigurationsSection'
import {
  commit_message_instructions as default_commit_message_instructions,
  voice_input_instructions as default_voice_input_instructions
} from '@/constants/instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'

export type NavItem =
  | 'preferences'
  | 'prompt-field'
  | 'checkpoints'
  | 'commit-messages'
  | 'edit-format'
  | 'misc'
  | 'chatbots'
  | 'web-configurations'
  | 'api-calls'
  | 'model-providers'
  | 'api-configurations'
  | 'instructions'

type NavConfigItem = { id: NavItem; label: TranslationKey; is_nested?: boolean }

const NAV_ITEMS_CONFIG: NavConfigItem[] = [
  {
    id: 'preferences',
    label: 'sections.preferences'
  },
  {
    id: 'prompt-field',
    label: 'preferences.prompt-field.title',
    is_nested: true
  },
  {
    id: 'checkpoints',
    label: 'preferences.checkpoints.title',
    is_nested: true
  },
  {
    id: 'commit-messages',
    label: 'preferences.commit-messages.title',
    is_nested: true
  },
  {
    id: 'edit-format',
    label: 'preferences.edit-formats.title',
    is_nested: true
  },
  {
    id: 'misc',
    label: 'preferences.misc.title',
    is_nested: true
  },
  {
    id: 'chatbots',
    label: 'sections.chatbots'
  },
  {
    id: 'web-configurations',
    label: 'web-configurations.configurations.title',
    is_nested: true
  },
  {
    id: 'api-calls',
    label: 'sections.api-configurations'
  },
  {
    id: 'model-providers',
    label: 'sections.model-providers',
    is_nested: true
  },
  {
    id: 'api-configurations',
    label: 'web-configurations.configurations.title',
    is_nested: true
  },
  {
    id: 'instructions',
    label: 'configurations.instructions.title',
    is_nested: true
  }
]

type Props = {
  providers: Provider[]
  api_configurations: ApiConfiguration[]
  web_configurations: WebConfiguration[]
  defaults: Record<ToolType, string | null>
  edit_files_system_instructions: string
  voice_input_instructions: string
  voice_input_push_to_talk: boolean
  commit_message_instructions: string
  include_prompts_in_commit_messages: boolean
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
  extended_cache_duration_for_anthropic: boolean
  auto_run_intelligent_update: boolean
  set_providers: (providers: Provider[]) => void
  set_api_configurations: (configurations: ApiConfiguration[]) => void
  set_web_configurations: (configurations: WebConfiguration[]) => void
  on_context_size_warning_threshold_change: (
    threshold: number | undefined
  ) => void
  on_commit_instructions_change: (instructions: string) => void
  on_include_prompts_in_commit_messages_change: (enabled: boolean) => void
  on_edit_format_instructions_change: (
    instructions: EditFormatInstructions
  ) => void
  on_edit_files_system_instructions_change: (instructions: string) => void
  on_voice_input_instructions_change: (instructions: string) => void
  on_voice_input_push_to_talk_change: (enabled: boolean) => void
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
  on_auto_run_intelligent_update_change: (enabled: boolean) => void
  on_extended_cache_duration_for_anthropic_change: (enabled: boolean) => void
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
    tool_name: ToolType,
    api_configuration_id: string | null
  ) => void
  on_select_default_api_configuration: (tool_name: ToolType) => void
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
    preferences: null,
    'prompt-field': null,
    checkpoints: null,
    'commit-messages': null,
    'edit-format': null,
    misc: null,
    chatbots: null,
    'web-configurations': null,
    'api-calls': null,
    'model-providers': null,
    'api-configurations': null,
    instructions: null
  })

  const set_section_ref = useCallback(
    (id: NavItem, el: HTMLDivElement | null) => {
      section_refs.current[id] = el
    },
    []
  )

  const [commit_instructions, set_commit_instructions] = useState('')
  const [voice_input_instructions, set_voice_input_instructions] = useState('')
  const [edit_files_instructions, set_edit_files_instructions] = useState('')

  const get_has_warning = (id: NavItem): boolean => {
    if (id == 'model-providers') {
      return props.providers.length == 0
    } else if (id == 'api-configurations') {
      return props.api_configurations.length == 0
    } else if (id == 'web-configurations') {
      return props.web_configurations.length == 0
    } else {
      return false
    }
  }

  const [active_nav_item_id, set_active_nav_item_id] = useState<NavItem>(
    NAV_ITEMS_CONFIG[0].id
  )

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
          if (rect.top <= container_rect.top + 150) {
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
    set_voice_input_instructions(props.voice_input_instructions || '')
  }, [props.voice_input_instructions])

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
        (i) => i.id === item_id
      )?.is_nested
      if (is_subsection) {
        extra_offset = -112
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
          return (
            <UiNavigationItem
              key={i}
              href={`#${item.id}`}
              label={t(item.label)}
              is_active={item.id === active_nav_item_id}
              has_warning={get_has_warning(item.id)}
              on_click={(e) => handle_nav_click(e, item.id)}
              is_nested={item.is_nested}
              is_last_nested={
                item.is_nested && !NAV_ITEMS_CONFIG[i + 1]?.is_nested
              }
            />
          )
        })}
      >
        <PreferencesSection
          ref={(el) => set_section_ref('preferences', el)}
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
          include_prompts_in_commit_messages={
            props.include_prompts_in_commit_messages
          }
          on_include_prompts_in_commit_messages_change={
            props.on_include_prompts_in_commit_messages_change
          }
          voice_input_push_to_talk={props.voice_input_push_to_talk}
          on_voice_input_push_to_talk_change={
            props.on_voice_input_push_to_talk_change
          }
        />

        <WebConfigurationsSection
          ref={(el) => set_section_ref('chatbots', el)}
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
          ref={(el) => set_section_ref('api-calls', el)}
          set_section_ref={set_section_ref}
          providers={props.providers}
          set_providers={props.set_providers}
          on_add_provider={props.on_add_provider}
          on_delete_provider={props.on_delete_provider}
          on_edit_provider={props.on_edit_provider}
          on_reorder_providers={props.on_reorder_providers}
          extended_cache_duration_for_anthropic={
            props.extended_cache_duration_for_anthropic
          }
          on_extended_cache_duration_for_anthropic_change={
            props.on_extended_cache_duration_for_anthropic_change
          }
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
          commit_instructions={commit_instructions}
          voice_input_instructions={voice_input_instructions}
          set_edit_files_instructions={set_edit_files_instructions}
          set_commit_instructions={set_commit_instructions}
          set_voice_input_instructions={set_voice_input_instructions}
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
          on_voice_input_instructions_blur={() => {
            props.on_voice_input_instructions_change(voice_input_instructions)
            if (
              voice_input_instructions == '' &&
              props.voice_input_instructions == default_voice_input_instructions
            ) {
              set_voice_input_instructions(default_voice_input_instructions)
            }
          }}
          default_edit_files_instructions={default_system_instructions}
          default_commit_instructions={default_commit_message_instructions}
          default_voice_input_instructions={default_voice_input_instructions}
          on_restore_edit_files_instructions={() => {
            set_edit_files_instructions(default_system_instructions)
            props.on_edit_files_system_instructions_change(
              default_system_instructions
            )
          }}
          on_restore_commit_instructions={() => {
            set_commit_instructions(default_commit_message_instructions)
            props.on_commit_instructions_change(
              default_commit_message_instructions
            )
          }}
          on_restore_voice_input_instructions={() => {
            set_voice_input_instructions(default_voice_input_instructions)
            props.on_voice_input_instructions_change(
              default_voice_input_instructions
            )
          }}
        />
      </UiLayout>
    </div>
  )
}
