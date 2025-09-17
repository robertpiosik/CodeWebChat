import { useState } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersPage } from './pages/ModelProvidersPage'
import { ApiToolConfigurationPage } from './pages/ApiToolConfigurationPage'
import { use_settings_data } from './hooks/use-settings-data'

type NavItem =
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const [active_item, set_active_item] = useState<NavItem>('model-providers')

  const settings_data_hook = use_settings_data(vscode)

  const handle_nav_click = (item: NavItem) => {
    set_active_item(item)
    settings_data_hook.fetch_data_for_nav_item(item)
  }

  const render_active_page = () => {
    switch (active_item) {
      case 'model-providers':
        return (
          <ModelProvidersPage
            vscode={vscode}
            providers={settings_data_hook.providers}
            set_providers={settings_data_hook.set_providers}
          />
        )
      case 'code-completions':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            configurations={settings_data_hook.code_completions_configs}
            set_configurations={settings_data_hook.set_code_completions_configs}
            title="Code Completions"
            subtitle="Get accurate code-at-cursor from state-of-the-art reasoning models."
            tool_name="CODE_COMPLETIONS"
            can_have_default={true}
          />
        )
      case 'edit-context':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            configurations={settings_data_hook.edit_context_configs}
            set_configurations={settings_data_hook.set_edit_context_configs}
            title="Edit Context"
            subtitle="Modify files based on natural language instructions."
            tool_name="EDIT_CONTEXT"
            can_have_default={false}
          />
        )
      case 'intelligent-update':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            configurations={settings_data_hook.intelligent_update_configs}
            set_configurations={
              settings_data_hook.set_intelligent_update_configs
            }
            title="Intelligent Update"
            subtitle="Integrate truncated code blocks and fix malformed diffs."
            tool_name="INTELLIGENT_UPDATE"
            can_have_default={true}
          />
        )
      case 'commit-messages':
        return (
          <ApiToolConfigurationPage
            vscode={vscode}
            configurations={settings_data_hook.commit_messages_configs}
            set_configurations={settings_data_hook.set_commit_messages_configs}
            title="Commit Messages"
            subtitle="Generate meaningful summaries of changes adhering to your preferred style."
            tool_name="COMMIT_MESSAGES"
            can_have_default={true}
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
            on_click={() => handle_nav_click('model-providers')}
          />
          <NavigationItem
            key="code-completions"
            label="Code Completions"
            codicon="tools"
            is_active={active_item == 'code-completions'}
            on_click={() => handle_nav_click('code-completions')}
          />
          <NavigationItem
            key="edit-context"
            label="Edit Context"
            codicon="tools"
            is_active={active_item == 'edit-context'}
            on_click={() => handle_nav_click('edit-context')}
          />
          <NavigationItem
            key="intelligent-update"
            label="Intelligent Update"
            codicon="tools"
            is_active={active_item == 'intelligent-update'}
            on_click={() => handle_nav_click('intelligent-update')}
          />
          <NavigationItem
            key="commit-messages"
            label="Commit Messages"
            codicon="tools"
            is_active={active_item == 'commit-messages'}
            on_click={() => handle_nav_click('commit-messages')}
          />
        </>
      }
    >
      {render_active_page()}
    </Layout>
  )
}
