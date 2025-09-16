import { useState } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersPage } from './pages/ModelProvidersPage'
import { ApiToolConfigurationPage } from './pages/ApiToolConfigurationPage'

type NavItem =
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const [active_item, set_active_item] = useState<NavItem>('model-providers')

  const render_active_page = () => {
    switch (active_item) {
      case 'model-providers':
        return <ModelProvidersPage vscode={vscode} />
      case 'code-completions':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            title="Code Completions"
            subtitle="Get accurate code-at-cursor from state-of-the-art reasoning models."
            tool_name="CODE_COMPLETIONS"
            has_default={true}
          />
        )
      case 'edit-context':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            title="Edit Context"
            subtitle="Modify files based on natural language instructions."
            tool_name="EDIT_CONTEXT"
            has_default={false}
          />
        )
      case 'intelligent-update':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            title="Intelligent Update"
            subtitle="Integrate truncated code blocks and fix malformed diffs."
            tool_name="INTELLIGENT_UPDATE"
            has_default={true}
          />
        )
      case 'commit-messages':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            title="Commit Messages"
            subtitle="Generate meaningful summaries of changes adhering to your preferred style."
            tool_name="COMMIT_MESSAGES"
            has_default={true}
          />
        )
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
            key="model-providers"
            label="Model Providers"
            codicon="key"
            is_active={active_item == 'model-providers'}
            on_click={() => set_active_item('model-providers')}
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
