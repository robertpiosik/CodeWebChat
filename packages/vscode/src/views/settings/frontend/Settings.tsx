import { useState, useRef, useEffect, useMemo } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersPage } from './pages/ModelProvidersPage'
import { ApiToolConfigurationPage } from './pages/ApiToolConfigurationPage'
import { use_settings_data } from './hooks/use-settings-data'
import { dictionary } from '@shared/constants/dictionary'
import { post_message } from './utils/post_message'
import { BackendMessage } from '../types/messages'

type NavItem =
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const NAV_ITEMS_CONFIG: { id: NavItem; label: string; codicon: string }[] = [
  {
    id: 'model-providers',
    label: dictionary.settings.MODEL_PROVIDERS_LABEL,
    codicon: 'key'
  },
  { id: 'code-completions', label: 'Code Completions', codicon: 'tools' },
  { id: 'edit-context', label: 'Edit Context', codicon: 'tools' },
  { id: 'intelligent-update', label: 'Intelligent Update', codicon: 'tools' },
  { id: 'commit-messages', label: 'Commit Messages', codicon: 'tools' }
]

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const [active_item, set_active_item] = useState<NavItem>('model-providers')
  const settings_data_hook = use_settings_data(vscode)
  const scroll_container_ref = useRef<HTMLDivElement>(null)
  const section_refs = useRef<Record<NavItem, HTMLDivElement | null>>({
    'model-providers': null,
    'code-completions': null,
    'edit-context': null,
    'intelligent-update': null,
    'commit-messages': null
  })
  const is_scrolling_from_click = useRef(false)

  const all_data_loaded = useMemo(() => {
    return (
      settings_data_hook.providers !== undefined &&
      settings_data_hook.code_completions_configs !== undefined &&
      settings_data_hook.commit_messages_configs !== undefined &&
      settings_data_hook.edit_context_configs !== undefined &&
      settings_data_hook.intelligent_update_configs !== undefined
    )
  }, [settings_data_hook])

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
    if (!all_data_loaded) return
    post_message(vscode, { command: 'SETTINGS_UI_READY' })
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command == 'SHOW_SECTION') {
        handle_scroll_to_section(event.data.section as NavItem)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [all_data_loaded])

  useEffect(() => {
    if (!all_data_loaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (is_scrolling_from_click.current) return

        const intersecting_entries = entries.filter((e) => e.isIntersecting)
        if (intersecting_entries.length > 0) {
          intersecting_entries.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )
          set_active_item(intersecting_entries[0].target.id as NavItem)
        }
      },
      {
        root: scroll_container_ref.current,
        rootMargin: '-33% 0px -67% 0px',
        threshold: 0
      }
    )

    Object.values(section_refs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => {
      Object.values(section_refs.current).forEach((ref) => {
        if (ref) observer.unobserve(ref)
      })
    }
  }, [all_data_loaded])

  const handle_nav_click = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item_id: NavItem
  ) => {
    e.preventDefault()
    handle_scroll_to_section(item_id)
  }

  if (!all_data_loaded) return null

  return (
    <div style={{ height: '100vh' }}>
      <Layout
        ref={scroll_container_ref}
        title={dictionary.settings.SETTINGS_TITLE}
        sidebar={
          <>
            {NAV_ITEMS_CONFIG.map(({ id, label, codicon }) => (
              <NavigationItem
                key={id}
                href={`#${id}`}
                label={label}
                codicon={codicon}
                is_active={active_item === id}
                on_click={(e) => handle_nav_click(e, id)}
              />
            ))}
          </>
        }
      >
        <ModelProvidersPage
          ref={(el) => (section_refs.current['model-providers'] = el)}
          id="model-providers"
          vscode={vscode}
          providers={settings_data_hook.providers}
          set_providers={settings_data_hook.set_providers}
        />
        <ApiToolConfigurationPage
          ref={(el) => (section_refs.current['code-completions'] = el)}
          id="code-completions"
          vscode={vscode}
          configurations={settings_data_hook.code_completions_configs}
          set_configurations={settings_data_hook.set_code_completions_configs}
          title={dictionary.settings.CODE_COMPLETIONS_LABEL}
          subtitle={dictionary.settings.CODE_COMPLETIONS_SUBTITLE}
          tool_name="CODE_COMPLETIONS"
          can_have_default={true}
        />
        <ApiToolConfigurationPage
          ref={(el) => (section_refs.current['edit-context'] = el)}
          id="edit-context"
          vscode={vscode}
          configurations={settings_data_hook.edit_context_configs}
          set_configurations={settings_data_hook.set_edit_context_configs}
          title={dictionary.settings.EDIT_CONTEXT_LABEL}
          subtitle={dictionary.settings.EDIT_CONTEXT_SUBTITLE}
          tool_name="EDIT_CONTEXT"
          can_have_default={false}
        />
        <ApiToolConfigurationPage
          ref={(el) => (section_refs.current['intelligent-update'] = el)}
          id="intelligent-update"
          vscode={vscode}
          configurations={settings_data_hook.intelligent_update_configs}
          set_configurations={settings_data_hook.set_intelligent_update_configs}
          title={dictionary.settings.INTELLIGENT_UPDATE_LABEL}
          subtitle={dictionary.settings.INTELLIGENT_UPDATE_SUBTITLE}
          tool_name="INTELLIGENT_UPDATE"
          can_have_default={true}
        />
        <ApiToolConfigurationPage
          ref={(el) => (section_refs.current['commit-messages'] = el)}
          id="commit-messages"
          vscode={vscode}
          configurations={settings_data_hook.commit_messages_configs}
          set_configurations={settings_data_hook.set_commit_messages_configs}
          title={dictionary.settings.COMMIT_MESSAGES_LABEL}
          subtitle={dictionary.settings.COMMIT_MESSAGES_SUBTITLE}
          tool_name="COMMIT_MESSAGES"
          can_have_default={true}
        />
      </Layout>
    </div>
  )
}
