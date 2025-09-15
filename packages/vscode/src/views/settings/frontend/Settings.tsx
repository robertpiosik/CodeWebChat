import { useState } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ApiProvidersPage } from './pages/ApiProvidersPage'
import { CodeCompletionsPage } from './pages/CodeCompletionsPage'
import { CommitMessagesPage } from './pages/CommitMessagesPage'
import { EditContextPage } from './pages/EditContextPage'
import { IntelligentUpdatePage } from './pages/IntelligentUpdatePage'

type NavItem =
  | 'api-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const [active_item, set_active_item] = useState<NavItem>('api-providers')

  const render_active_page = () => {
    switch (active_item) {
      case 'api-providers':
        return <ApiProvidersPage vscode={vscode} />
      case 'code-completions':
        return <CodeCompletionsPage vscode={vscode} />
      case 'edit-context':
        return <EditContextPage vscode={vscode} />
      case 'intelligent-update':
        return <IntelligentUpdatePage vscode={vscode} />
      case 'commit-messages':
        return <CommitMessagesPage vscode={vscode} />
      default:
        return <div>Select a setting from the sidebar.</div>
    }
  }

  return (
    <Layout
      title="Settings"
      sidebar={
        <>
          <NavigationItem
            key="api-providers"
            label="API Providers"
            codicon="key"
            is_active={active_item == 'api-providers'}
            on_click={() => set_active_item('api-providers')}
          />
          <NavigationItem
            key="code-completions"
            label="Code Completions"
            codicon="tools"
            is_active={active_item == 'code-completions'}
            on_click={() => set_active_item('code-completions')}
          />
          <NavigationItem
            key="edit-context"
            label="Edit Context"
            codicon="tools"
            is_active={active_item == 'edit-context'}
            on_click={() => set_active_item('edit-context')}
          />
          <NavigationItem
            key="intelligent-update"
            label="Intelligent Update"
            codicon="tools"
            is_active={active_item == 'intelligent-update'}
            on_click={() => set_active_item('intelligent-update')}
          />
          <NavigationItem
            key="commit-messages"
            label="Commit Messages"
            codicon="tools"
            is_active={active_item == 'commit-messages'}
            on_click={() => set_active_item('commit-messages')}
          />
        </>
      }
    >
      {render_active_page()}
    </Layout>
  )
}
