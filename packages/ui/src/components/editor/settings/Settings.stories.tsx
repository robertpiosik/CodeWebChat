import { useState } from 'react'
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

const StoryComponent = () => {
  const [activeItem, setActiveItem] = useState<NavItem>('model-providers')
  const [providers, setProviders] = useState(initialProviders)
  const [codeCompletions, setCodeCompletions] = useState(initialCodeCompletions)
  const [editContext, setEditContext] = useState(initialEditContext)

  const renderActivePage = () => {
    switch (activeItem) {
      case 'model-providers':
        return (
          <Page
            title="Model Providers"
            subtitle="Manage your model providers here. Add, edit, reorder, or delete providers as needed."
          >
            <ModelProviders
              providers={providers}
              on_reorder={(reordered) => {
                console.log('reordered providers', reordered)
                setProviders(reordered)
              }}
              on_add_provider={() => console.log('Add provider clicked')}
              on_delete_provider={(name) =>
                console.log('Delete provider', name)
              }
              on_rename_provider={(name) =>
                console.log('Rename provider', name)
              }
              on_change_api_key={(name) =>
                console.log('Change API key for', name)
              }
            />
          </Page>
        )
      case 'code-completions':
        return (
          <Page
            title="Code Completions"
            subtitle="Configure models for generating code completions."
          >
            <ConfigurationsList
              configurations={codeCompletions}
              on_add={() => console.log('Add code completion config')}
              on_delete={(id) =>
                console.log('Delete code completion config', id)
              }
              on_edit={(id) => console.log('Edit code completion config', id)}
              on_reorder={(reordered) => {
                console.log('Reorder code completion configs', reordered)
                setCodeCompletions(reordered)
              }}
              on_set_default={(id) => {
                console.log('Set default code completion config', id)
                setCodeCompletions(
                  codeCompletions.map((c) => ({
                    ...c,
                    is_default: c.id === id
                  }))
                )
              }}
              on_unset_default={() => {
                console.log('Unset default code completion config')
                setCodeCompletions(
                  codeCompletions.map((c) => ({ ...c, is_default: false }))
                )
              }}
            />
          </Page>
        )
      case 'edit-context':
        return (
          <Page
            title="Edit Context"
            subtitle="Configure models for editing code with context. This tool does not support a default configuration."
          >
            <ConfigurationsList
              configurations={editContext}
              on_add={() => console.log('Add edit context config')}
              on_delete={(id) => console.log('Delete edit context config', id)}
              on_edit={(id) => console.log('Edit edit context config', id)}
              on_reorder={(reordered) => {
                console.log('Reorder edit context configs', reordered)
                setEditContext(reordered)
              }}
            />
          </Page>
        )
      default:
        return (
          <Page
            title="Coming Soon"
            subtitle={`Configuration for "${activeItem}" is not yet implemented in this story.`}
          >
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                fontStyle: 'italic',
                color: 'var(--vscode-descriptionForeground)'
              }}
            >
              Select another setting from the sidebar.
            </div>
          </Page>
        )
    }
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
        title="Settings"
        sidebar={
          <>
            <NavigationItem
              key="model-providers"
              label="Model Providers"
              codicon="key"
              is_active={activeItem === 'model-providers'}
              on_click={() => setActiveItem('model-providers')}
            />
            <NavigationItem
              key="code-completions"
              label="Code Completions"
              codicon="tools"
              is_active={activeItem === 'code-completions'}
              on_click={() => setActiveItem('code-completions')}
            />
            <NavigationItem
              key="edit-context"
              label="Edit Context"
              codicon="tools"
              is_active={activeItem === 'edit-context'}
              on_click={() => setActiveItem('edit-context')}
            />
            <NavigationItem
              key="intelligent-update"
              label="Intelligent Update"
              codicon="tools"
              is_active={activeItem === 'intelligent-update'}
              on_click={() => setActiveItem('intelligent-update')}
            />
            <NavigationItem
              key="commit-messages"
              label="Commit Messages"
              codicon="tools"
              is_active={activeItem === 'commit-messages'}
              on_click={() => setActiveItem('commit-messages')}
            />
          </>
        }
      >
        {renderActivePage()}
      </Layout>
    </div>
  )
}

export const Default: StoryObj = {
  render: () => <StoryComponent />
}
