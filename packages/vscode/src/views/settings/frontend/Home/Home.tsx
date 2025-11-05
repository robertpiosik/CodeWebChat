import { useState, useRef, useEffect, useCallback } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersSection } from './sections/ModelProvidersSection'
import { NavigationDivider } from '@ui/components/editor/settings/NavigationDivider'
import { Item } from '@ui/components/editor/settings/Item'
import { ApiToolConfigurationSection } from './sections/ApiToolConfigurationSection'
import { Section } from '@ui/components/editor/settings/Section'
import { Textarea } from '@ui/components/editor/settings/Textarea'
import {
  ConfigurationForClient,
  ProviderForClient
} from '@/views/settings/types/messages'
import { GeneralSection } from './sections/GeneralSection'
import { PresetsSection } from './sections/PresetsSection'

type NavItem =
  | 'general'
  | 'presets'
  | 'model-providers'
  | 'edit-context'
  | 'code-completions'
  | 'intelligent-update'
  | 'commit-messages'

type NavConfigItem =
  | { type: 'item'; id: NavItem; label: string }
  | { type: 'divider'; text?: string }

const NAV_ITEMS_CONFIG: NavConfigItem[] = [
  {
    type: 'item',
    id: 'general',
    label: 'General'
  },
  {
    type: 'item',
    id: 'presets',
    label: 'Presets'
  },
  {
    type: 'item',
    id: 'model-providers',
    label: 'Model Providers'
  },
  { type: 'divider', text: 'API Tools' },
  { type: 'item', id: 'edit-context', label: 'Edit Context' },
  { type: 'item', id: 'code-completions', label: 'Code Completions' },
  { type: 'item', id: 'intelligent-update', label: 'Intelligent Update' },
  { type: 'item', id: 'commit-messages', label: 'Commit Messages' }
]

type Props = {
  // data
  providers: ProviderForClient[]
  code_completions_configs: ConfigurationForClient[]
  commit_messages_configs: ConfigurationForClient[]
  edit_context_configs: ConfigurationForClient[]
  intelligent_update_configs: ConfigurationForClient[]
  commit_message_instructions: string
  context_size_warning_threshold: number
  gemini_user_id: number | null
  clear_checks_in_workspace: 'ignore-open-editors' | 'uncheck-all'

  // handlers
  set_providers: (providers: ProviderForClient[]) => void
  set_edit_context_configs: (configs: ConfigurationForClient[]) => void
  set_code_completions_configs: (configs: ConfigurationForClient[]) => void
  set_intelligent_update_configs: (configs: ConfigurationForClient[]) => void
  set_commit_messages_configs: (configs: ConfigurationForClient[]) => void
  on_context_size_warning_threshold_change: (threshold: number) => void
  on_commit_instructions_change: (instructions: string) => void
  on_gemini_user_id_change: (id: number | null) => void
  on_clear_checks_in_workspace_change: (
    value: 'ignore-open-editors' | 'uncheck-all'
  ) => void
  on_open_editor_settings: () => void
  on_add_provider: () => void
  on_delete_provider: (provider_name: string) => void
  on_rename_provider: (provider_name: string) => void
  on_change_api_key: (provider_name: string) => void
  on_reorder_providers: (reordered_providers: ProviderForClient[]) => void
  on_add_config: (tool_name: string) => void
  on_reorder_configs: (
    tool_name: string,
    reordered: ConfigurationForClient[]
  ) => void
  on_edit_config: (tool_name: string, configuration_id: string) => void
  on_delete_config: (tool_name: string, configuration_id: string) => void
  on_set_default_config: (tool_name: string, configuration_id: string) => void
  on_unset_default_config: (tool_name: string) => void
  scroll_to_section_on_load?: NavItem
}

export const Home: React.FC<Props> = (props) => {
  const scroll_container_ref = useRef<HTMLDivElement>(null)
  const section_refs = useRef<Record<NavItem, HTMLDivElement | null>>({
    general: null,
    presets: null,
    'model-providers': null,
    'edit-context': null,
    'code-completions': null,
    'intelligent-update': null,
    'commit-messages': null
  })
  const [commit_instructions, set_commit_instructions] = useState('')
  const [stuck_sections, set_stuck_sections] = useState(new Set<NavItem>())

  const handle_stuck_change = useCallback((id: NavItem, is_stuck: boolean) => {
    set_stuck_sections((prev) => {
      const is_currently_stuck = prev.has(id)
      if (is_stuck === is_currently_stuck) {
        return prev
      }
      const next = new Set(prev)
      if (is_stuck) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const general_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('general', is_stuck),
    [handle_stuck_change]
  )
  const presets_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('presets', is_stuck),
    [handle_stuck_change]
  )
  const model_providers_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('model-providers', is_stuck),
    [handle_stuck_change]
  )
  const edit_context_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('edit-context', is_stuck),
    [handle_stuck_change]
  )
  const code_completions_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('code-completions', is_stuck),
    [handle_stuck_change]
  )
  const intelligent_update_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('intelligent-update', is_stuck),
    [handle_stuck_change]
  )
  const commit_messages_on_stuck_change = useCallback(
    (is_stuck: boolean) => handle_stuck_change('commit-messages', is_stuck),
    [handle_stuck_change]
  )

  const nav_item_ids = NAV_ITEMS_CONFIG.filter(
    (item): item is Extract<NavConfigItem, { type: 'item' }> =>
      item.type === 'item'
  ).map((item) => item.id)
  const active_nav_item_id =
    nav_item_ids.filter((id) => stuck_sections.has(id)).pop() || nav_item_ids[0]

  useEffect(() => {
    set_commit_instructions(props.commit_message_instructions || '')
  }, [props.commit_message_instructions])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (
        props.commit_message_instructions !== undefined &&
        commit_instructions !== props.commit_message_instructions
      ) {
        props.on_commit_instructions_change(commit_instructions)
      }
    }, 500)
    return () => clearTimeout(handler)
  }, [
    commit_instructions,
    props.on_commit_instructions_change,
    props.commit_message_instructions
  ])

  const handle_scroll_to_section = (item_id: NavItem) => {
    const section = section_refs.current[item_id]
    const scroll_container = scroll_container_ref.current

    if (section && scroll_container) {
      const container_rect = scroll_container.getBoundingClientRect()
      const section_rect = section.getBoundingClientRect()

      const offset = section_rect.top - container_rect.top
      const target_scroll_top = scroll_container.scrollTop + offset

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
      <Layout
        ref={scroll_container_ref}
        title="Settings"
        sidebar={NAV_ITEMS_CONFIG.map((item, i) => {
          if (item.type == 'divider') {
            return <NavigationDivider key={i} text={item.text} />
          }

          return (
            <NavigationItem
              key={i}
              href={`#${item.id}`}
              label={item.label}
              is_active={item.id === active_nav_item_id}
              on_click={(e) => handle_nav_click(e, item.id)}
            />
          )
        })}
      >
        <GeneralSection
          ref={(el) => (section_refs.current['general'] = el)}
          context_size_warning_threshold={props.context_size_warning_threshold}
          on_context_size_warning_threshold_change={
            props.on_context_size_warning_threshold_change
          }
          clear_checks_in_workspace={props.clear_checks_in_workspace}
          on_clear_checks_in_workspace_change={
            props.on_clear_checks_in_workspace_change
          }
          on_open_editor_settings={props.on_open_editor_settings}
          on_stuck_change={general_on_stuck_change}
        />
        <PresetsSection
          ref={(el) => (section_refs.current['presets'] = el)}
          gemini_user_id={props.gemini_user_id}
          on_gemini_user_id_change={props.on_gemini_user_id_change}
          on_stuck_change={presets_on_stuck_change}
        />
        <Section
          ref={(el) => (section_refs.current['model-providers'] = el)}
          title="Model Providers"
          subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
          on_stuck_change={model_providers_on_stuck_change}
        >
          <ModelProvidersSection
            providers={props.providers}
            on_reorder={(reordered) => {
              props.set_providers(reordered)
              props.on_reorder_providers(reordered)
            }}
            on_add_provider={props.on_add_provider}
            on_delete_provider={props.on_delete_provider}
            on_rename_provider={props.on_rename_provider}
            on_change_api_key={props.on_change_api_key}
          />
        </Section>
        <Section
          ref={(el) => (section_refs.current['edit-context'] = el)}
          group="API Tool"
          title="Edit Context"
          subtitle="Modify, create or delete files based on natural language instructions."
          on_stuck_change={edit_context_on_stuck_change}
        >
          <ApiToolConfigurationSection
            configurations={props.edit_context_configs}
            set_configurations={props.set_edit_context_configs}
            tool_name="EDIT_CONTEXT"
            can_have_default={false}
            on_add={() => props.on_add_config('EDIT_CONTEXT')}
            on_reorder={(reordered) =>
              props.on_reorder_configs('EDIT_CONTEXT', reordered)
            }
            on_edit={(id) => props.on_edit_config('EDIT_CONTEXT', id)}
            on_delete={(id) => props.on_delete_config('EDIT_CONTEXT', id)}
          />
        </Section>
        <Section
          ref={(el) => (section_refs.current['code-completions'] = el)}
          group="API Tool"
          title="Code Completions"
          subtitle="Get accurate code-at-cursor from state-of-the-art reasoning models."
          on_stuck_change={code_completions_on_stuck_change}
        >
          <ApiToolConfigurationSection
            configurations={props.code_completions_configs}
            set_configurations={props.set_code_completions_configs}
            tool_name="CODE_COMPLETIONS"
            can_have_default={true}
            on_add={() => props.on_add_config('CODE_COMPLETIONS')}
            on_reorder={(reordered) =>
              props.on_reorder_configs('CODE_COMPLETIONS', reordered)
            }
            on_edit={(id) => props.on_edit_config('CODE_COMPLETIONS', id)}
            on_delete={(id) => props.on_delete_config('CODE_COMPLETIONS', id)}
            on_set_default={(id) =>
              props.on_set_default_config('CODE_COMPLETIONS', id)
            }
            on_unset_default={() =>
              props.on_unset_default_config('CODE_COMPLETIONS')
            }
          />
        </Section>
        <Section
          ref={(el) => (section_refs.current['intelligent-update'] = el)}
          group="API Tool"
          title="Intelligent Update"
          subtitle={`Handle "truncated" edit format and malformed diffs.`}
          on_stuck_change={intelligent_update_on_stuck_change}
        >
          <ApiToolConfigurationSection
            configurations={props.intelligent_update_configs}
            set_configurations={props.set_intelligent_update_configs}
            tool_name="INTELLIGENT_UPDATE"
            can_have_default={true}
            on_add={() => props.on_add_config('INTELLIGENT_UPDATE')}
            on_reorder={(reordered) =>
              props.on_reorder_configs('INTELLIGENT_UPDATE', reordered)
            }
            on_edit={(id) => props.on_edit_config('INTELLIGENT_UPDATE', id)}
            on_delete={(id) => props.on_delete_config('INTELLIGENT_UPDATE', id)}
            on_set_default={(id) =>
              props.on_set_default_config('INTELLIGENT_UPDATE', id)
            }
            on_unset_default={() =>
              props.on_unset_default_config('INTELLIGENT_UPDATE')
            }
          />
        </Section>
        <Section
          ref={(el) => (section_refs.current['commit-messages'] = el)}
          group="API Tool"
          title="Commit Messages"
          subtitle="Generate meaningful summaries of changes adhering to your style."
          on_stuck_change={commit_messages_on_stuck_change}
        >
          <Item
            title="Commit Message Instructions"
            description="Customize the instructions used when generating commit messages. These instructions are sent to the model along with the code changes."
            slot_placement="below"
            slot={
              <Textarea
                value={commit_instructions}
                onChange={(e) => set_commit_instructions(e.target.value)}
              />
            }
          />
          <ApiToolConfigurationSection
            configurations={props.commit_messages_configs}
            set_configurations={props.set_commit_messages_configs}
            tool_name="COMMIT_MESSAGES"
            can_have_default={true}
            on_add={() => props.on_add_config('COMMIT_MESSAGES')}
            on_reorder={(reordered) =>
              props.on_reorder_configs('COMMIT_MESSAGES', reordered)
            }
            on_edit={(id) => props.on_edit_config('COMMIT_MESSAGES', id)}
            on_delete={(id) => props.on_delete_config('COMMIT_MESSAGES', id)}
            on_set_default={(id) =>
              props.on_set_default_config('COMMIT_MESSAGES', id)
            }
            on_unset_default={() =>
              props.on_unset_default_config('COMMIT_MESSAGES')
            }
          />
        </Section>
      </Layout>
    </div>
  )
}
