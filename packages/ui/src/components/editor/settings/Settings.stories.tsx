import { useState, useRef, useEffect } from 'react'
import { Layout } from './Layout'
import { NavigationItem } from './NavigationItem'
import { Page } from './Page'
import { ModelProviders } from './ModelProviders'
import { ConfigurationsList } from './ConfigurationsList'
import type { Meta, StoryObj } from '@storybook/react'

export default {
  component: Layout,
  parameters: {
    layout: 'fullscreen'
  }
} satisfies Meta<typeof Layout>

type NavItem =
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const initialProviders: ModelProviders.Provider[] = [
  {
    name: 'OpenAI',
    type: 'built-in',
    apiKeyMask: '...1234',
    baseUrl: 'https://api.openai.com/v1'
  },
  {
    name: 'Anthropic',
    type: 'built-in',
    apiKeyMask: '...5678',
    baseUrl: 'https://api.anthropic.com/v1'
  },
  {
    name: 'My Custom Endpoint',
    type: 'custom',
    apiKeyMask: '⚠ Missing API key',
    baseUrl: 'http://localhost:1234/v1'
  }
]

const initialCodeCompletions: ConfigurationsList.Configuration[] = [
  {
    id: '1',
    model: 'gpt-4',
    description: 'For complex tasks',
    is_default: true
  },
  { id: '2', model: 'gpt-3.5-turbo', description: 'For simple tasks' }
]

const initialEditContext: ConfigurationsList.Configuration[] = [
  { id: '3', model: 'claude-3-opus', description: 'High context window' },
  { id: '4', model: 'gemini-pro', description: "Google's best" }
]

const NAV_ITEMS_CONFIG: { id: NavItem; label: string; codicon: string }[] = [
  { id: 'model-providers', label: 'Model Providers', codicon: 'key' },
  { id: 'code-completions', label: 'Code Completions', codicon: 'tools' },
  { id: 'edit-context', label: 'Edit Context', codicon: 'tools' },
  { id: 'intelligent-update', label: 'Intelligent Update', codicon: 'tools' },
  { id: 'commit-messages', label: 'Commit Messages', codicon: 'tools' }
]

const StoryComponent = () => {
  const [activeItem, setActiveItem] = useState<NavItem>('model-providers')
  const [providers, setProviders] = useState(initialProviders)
  const [codeCompletions, setCodeCompletions] = useState(initialCodeCompletions)
  const [editContext, setEditContext] = useState(initialEditContext)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<NavItem, HTMLDivElement | null>>({
    'model-providers': null,
    'code-completions': null,
    'edit-context': null,
    'intelligent-update': null,
    'commit-messages': null
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting_entries = entries.filter((e) => e.isIntersecting)
        if (intersecting_entries.length > 0) {
          intersecting_entries.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )
          setActiveItem(intersecting_entries[0].target.id as NavItem)
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '-33% 0px -67% 0px'
      }
    )

    Object.values(sectionRefs.current).forEach(
      (ref) => ref && observer.observe(ref)
    )
    return () =>
      Object.values(sectionRefs.current).forEach(
        (ref) => ref && observer.unobserve(ref)
      )
  }, [])

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: NavItem
  ) => {
    e.preventDefault()
    sectionRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    setActiveItem(id)
  }

  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: 'var(--vscode-sideBar-background)',
        color: 'var(--vscode-foreground)'
      }}
    >
      <Layout
        ref={scrollContainerRef}
        title="Settings"
        sidebar={
          <>
            {NAV_ITEMS_CONFIG.map(({ id, label, codicon }) => (
              <NavigationItem
                key={id}
                label={label}
                codicon={codicon}
                href={`#${id}`}
                is_active={activeItem === id}
                on_click={(e) => handleNavClick(e, id)}
              />
            ))}
          </>
        }
      >
        <Page
          ref={(el) => (sectionRefs.current['model-providers'] = el)}
          id="model-providers"
          title="Model Providers"
          subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
        >
          <ModelProviders
            providers={providers}
            on_reorder={setProviders}
            on_add_provider={() => console.log('Add provider clicked')}
            on_delete_provider={(name) => console.log('Delete provider', name)}
            on_rename_provider={(name) => console.log('Rename provider', name)}
            on_change_api_key={(name) =>
              console.log('Change API key for', name)
            }
          />
        </Page>
        <Page
          ref={(el) => (sectionRefs.current['code-completions'] = el)}
          id="code-completions"
          title="Code Completions"
          subtitle="Configure models for generating code completions."
        >
          <ConfigurationsList
            configurations={codeCompletions}
            on_add={() => console.log('Add code completion config')}
            on_delete={(id) => console.log('Delete code completion config', id)}
            on_edit={(id) => console.log('Edit code completion config', id)}
            on_reorder={setCodeCompletions}
            on_set_default={(id) => {
              setCodeCompletions(
                codeCompletions.map((c) => ({ ...c, is_default: c.id === id }))
              )
            }}
            on_unset_default={() => {
              setCodeCompletions(
                codeCompletions.map((c) => ({ ...c, is_default: false }))
              )
            }}
          />
        </Page>
        <Page
          ref={(el) => (sectionRefs.current['edit-context'] = el)}
          id="edit-context"
          title="Edit Context"
          subtitle="Configure models for editing code with context. This tool does not support a default configuration."
        >
          <ConfigurationsList
            configurations={editContext}
            on_add={() => console.log('Add edit context config')}
            on_delete={(id) => console.log('Delete edit context config', id)}
            on_edit={(id) => console.log('Edit edit context config', id)}
            on_reorder={setEditContext}
          />
        </Page>
        <Page
          ref={(el) => (sectionRefs.current['intelligent-update'] = el)}
          id="intelligent-update"
          title="Intelligent Update"
          subtitle="Configuration for this tool is not yet implemented in this story."
        >
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              fontStyle: 'italic',
              color: 'var(--vscode-descriptionForeground)'
            }}
          >
            This is a placeholder section.
          </div>
        </Page>
        <Page
          ref={(el) => (sectionRefs.current['commit-messages'] = el)}
          id="commit-messages"
          title="Commit Messages"
          subtitle="Configuration for this tool is not yet implemented in this story."
        >
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              fontStyle: 'italic',
              color: 'var(--vscode-descriptionForeground)'
            }}
          >
            This is a placeholder section.
          </div>
        </Page>
      </Layout>
    </div>
  )
}

export const Default: StoryObj = {
  render: () => <StoryComponent />
}
