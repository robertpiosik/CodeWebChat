import { useState, useRef, useEffect } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersSection } from './sections/ModelProvidersSection'
import { Item } from '@ui/components/editor/settings/Item'
import { ApiToolConfigurationSection } from './sections/ApiToolConfigurationSection'
import { dictionary } from '@shared/constants/dictionary'
import { Section } from '@ui/components/editor/settings/Section'
import { TextButton } from '@ui/components/editor/settings/TextButton'
import { Textarea } from '@ui/components/editor/settings/Textarea'
import {
  ConfigurationForClient,
  ProviderForClient
} from '@/views/settings/types/messages'

type NavItem =
  | 'general'
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const NAV_ITEMS_CONFIG: { id: NavItem; label: string }[] = [
  {
    id: 'general',
    label: 'General'
  },
  {
    id: 'model-providers',
    label: dictionary.settings.MODEL_PROVIDERS_LABEL
  },
  { id: 'code-completions', label: 'Code Completions' },
  { id: 'edit-context', label: 'Edit Context' },
  { id: 'intelligent-update', label: 'Intelligent Update' },
  { id: 'commit-messages', label: 'Commit Messages' }
]

type Props = {
  // data
  providers: ProviderForClient[]
  code_completions_configs: ConfigurationForClient[]
  commit_messages_configs: ConfigurationForClient[]
  edit_context_configs: ConfigurationForClient[]
  intelligent_update_configs: ConfigurationForClient[]
  commit_message_instructions: string

  // handlers
  set_providers: (providers: ProviderForClient[]) => void
  set_code_completions_configs: (configs: ConfigurationForClient[]) => void
  set_commit_messages_configs: (configs: ConfigurationForClient[]) => void
  set_edit_context_configs: (configs: ConfigurationForClient[]) => void
  set_intelligent_update_configs: (configs: ConfigurationForClient[]) => void
  on_commit_instructions_change: (instructions: string) => void
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
  const [active_item, set_active_item] = useState<NavItem>('general')
  const scroll_container_ref = useRef<HTMLDivElement>(null)
  const section_refs = useRef<Record<NavItem, HTMLDivElement | null>>({
    general: null,
    'model-providers': null,
    'code-completions': null,
    'edit-context': null,
    'intelligent-update': null,
    'commit-messages': null
  })
  const is_scrolling_from_click = useRef(false)

  const [commit_instructions, set_commit_instructions] = useState('')

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
    is_scrolling_from_click.current = true
    set_active_item(item_id)
    section_refs.current[item_id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    setTimeout(() => {
      is_scrolling_from_click.current = false
    }, 1000)
  }

  useEffect(() => {
    if (props.scroll_to_section_on_load) {
      handle_scroll_to_section(props.scroll_to_section_on_load)
    }
  }, [props.scroll_to_section_on_load])

  useEffect(() => {
    const handle_scroll = () => {
      if (is_scrolling_from_click.current) return

      const THRESHOLD = 200 // 200px from top of viewport
      let closest_section: NavItem | null = null
      let closest_distance = Infinity

      NAV_ITEMS_CONFIG.forEach(({ id }) => {
        const element = section_refs.current[id]
        if (element) {
          const rect = element.getBoundingClientRect()
          const distance_from_threshold = Math.abs(rect.top - THRESHOLD)

          // Check if top edge is within 200px from top and is closest
          if (
            rect.top <= THRESHOLD &&
            rect.top >= 0 &&
            distance_from_threshold < closest_distance
          ) {
            closest_section = id
            closest_distance = distance_from_threshold
          }
        }
      })

      if (closest_section) {
        set_active_item(closest_section)
      }
    }

    const container = scroll_container_ref.current
    if (container) {
      container.addEventListener('scroll', handle_scroll)
      handle_scroll() // Check initial position
    }

    return () => {
      container?.removeEventListener('scroll', handle_scroll)
    }
  }, [])

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
        title={dictionary.settings.SETTINGS_TITLE}
        sidebar={
          <>
            {NAV_ITEMS_CONFIG.map(({ id, label }) => (
              <NavigationItem
                key={id}
                href={`#${id}`}
                label={label}
                is_active={active_item == id}
                on_click={(e) => handle_nav_click(e, id)}
              />
            ))}
          </>
        }
      >
        <Section
          ref={(el) => (section_refs.current['general'] = el)}
          title="General"
          subtitle="General settings for the extension."
        >
          <Item
            title="Open Editor Settings"
            description="For general editor settings, visit the Editor Settings Page."
            slot={
              <TextButton on_click={props.on_open_editor_settings}>
                Open Editor Settings
              </TextButton>
            }
          />
        </Section>
        <Section
          ref={(el) => (section_refs.current['model-providers'] = el)}
          title="Model Providers"
          subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
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
          ref={(el) => (section_refs.current['code-completions'] = el)}
          title={dictionary.settings.CODE_COMPLETIONS_LABEL}
          subtitle={dictionary.settings.CODE_COMPLETIONS_SUBTITLE}
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
          ref={(el) => (section_refs.current['edit-context'] = el)}
          title={dictionary.settings.EDIT_CONTEXT_LABEL}
          subtitle={dictionary.settings.EDIT_CONTEXT_SUBTITLE}
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
          ref={(el) => (section_refs.current['intelligent-update'] = el)}
          title={dictionary.settings.INTELLIGENT_UPDATE_LABEL}
          subtitle={dictionary.settings.INTELLIGENT_UPDATE_SUBTITLE}
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
          title={dictionary.settings.COMMIT_MESSAGES_LABEL}
          subtitle="Configure models for generating commit messages, and customize the instructions used."
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
