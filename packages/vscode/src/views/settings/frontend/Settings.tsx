import { useState } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'
import { ModelProvidersPage } from './pages/ModelProvidersPage'
import { ApiToolConfigurationPage } from './pages/ApiToolConfigurationPage'
import { use_settings_data } from './hooks/use-settings-data'
import { dictionary } from '@shared/constants/dictionary'

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

  const handle_nav_click = (item: NavItem) => set_active_item(item)

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
            title={dictionary.settings.CODE_COMPLETIONS_LABEL}
            subtitle={dictionary.settings.CODE_COMPLETIONS_SUBTITLE}
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
            title={dictionary.settings.EDIT_CONTEXT_LABEL}
            subtitle={dictionary.settings.EDIT_CONTEXT_SUBTITLE}
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
            title={dictionary.settings.INTELLIGENT_UPDATE_LABEL}
            subtitle={dictionary.settings.INTELLIGENT_UPDATE_SUBTITLE}
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
            title={dictionary.settings.COMMIT_MESSAGES_LABEL}
            subtitle={dictionary.settings.COMMIT_MESSAGES_SUBTITLE}
            tool_name="COMMIT_MESSAGES"
            can_have_default={true}
          />
        )
      default:
        return <div>{dictionary.settings.SELECT_SETTING_FROM_SIDEBAR}</div>
    }
  }

  return (
    <Layout
      title={dictionary.settings.SETTINGS_TITLE}
      sidebar={
        <>
          <NavigationItem
            key="model-providers"
            label={dictionary.settings.MODEL_PROVIDERS_LABEL}
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
