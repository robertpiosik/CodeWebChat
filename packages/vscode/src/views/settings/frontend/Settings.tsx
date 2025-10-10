import { useState, useEffect, useMemo } from 'react'
import { use_settings_data } from './hooks/use-settings-data'
import { post_message } from './utils/post_message'
import {
  BackendMessage,
  FrontendMessage,
  ProviderForClient,
  ConfigurationForClient
} from '../types/messages'
import { Home } from './Home/Home'

type NavItem =
  | 'general'
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const settings_data_hook = use_settings_data(vscode)
  const [scroll_to_section_on_load, set_scroll_to_section_on_load] =
    useState<NavItem>()

  const all_data_loaded = useMemo(() => {
    return (
      settings_data_hook.providers !== undefined &&
      settings_data_hook.code_completions_configs !== undefined &&
      settings_data_hook.commit_messages_configs !== undefined &&
      settings_data_hook.edit_context_configs !== undefined &&
      settings_data_hook.intelligent_update_configs !== undefined &&
      settings_data_hook.commit_message_instructions !== undefined
    )
  }, [settings_data_hook])

  useEffect(() => {
    if (!all_data_loaded) return
    post_message(vscode, { command: 'SETTINGS_UI_READY' })
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command == 'SHOW_SECTION') {
        set_scroll_to_section_on_load(event.data.section as NavItem)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [all_data_loaded])

  if (!all_data_loaded) return null

  const handle_reorder_providers = (
    reordered_providers: ProviderForClient[]
  ) => {
    settings_data_hook.set_providers(reordered_providers)
    post_message(vscode, {
      command: 'REORDER_MODEL_PROVIDERS',
      providers: reordered_providers
    })
  }

  const handle_add_provider = () => {
    post_message(vscode, { command: 'ADD_MODEL_PROVIDER' })
  }

  const handle_delete_provider = (provider_name: string) => {
    post_message(vscode, {
      command: 'DELETE_MODEL_PROVIDER',
      provider_name
    })
  }

  const handle_rename_provider = (provider_name: string) => {
    post_message(vscode, {
      command: 'RENAME_MODEL_PROVIDER',
      provider_name
    })
  }

  const handle_change_api_key = (provider_name: string) => {
    post_message(vscode, {
      command: 'CHANGE_MODEL_PROVIDER_KEY',
      provider_name
    })
  }

  const handle_add_config = (tool_name: string) => {
    post_message(vscode, {
      command: `ADD_${tool_name}_CONFIGURATION`
    } as FrontendMessage)
  }

  const handle_reorder_configs = (
    tool_name: string,
    reordered: ConfigurationForClient[]
  ) => {
    post_message(vscode, {
      command: `REORDER_${tool_name}_CONFIGURATIONS`,
      configurations: reordered
    } as FrontendMessage)
  }

  const handle_edit_config = (tool_name: string, configuration_id: string) => {
    post_message(vscode, {
      command: `EDIT_${tool_name}_CONFIGURATION`,
      configuration_id
    } as FrontendMessage)
  }

  const handle_delete_config = (
    tool_name: string,
    configuration_id: string
  ) => {
    post_message(vscode, {
      command: `DELETE_${tool_name}_CONFIGURATION`,
      configuration_id
    } as FrontendMessage)
  }

  const handle_set_default_config = (
    tool_name: string,
    configuration_id: string
  ) => {
    post_message(vscode, {
      command: `SET_DEFAULT_${tool_name}_CONFIGURATION`,
      configuration_id
    } as FrontendMessage)
  }

  const handle_unset_default_config = (tool_name: string) => {
    post_message(vscode, {
      command: `SET_DEFAULT_${tool_name}_CONFIGURATION`,
      configuration_id: null
    } as FrontendMessage)
  }

  return (
    <Home
      providers={settings_data_hook.providers!}
      code_completions_configs={settings_data_hook.code_completions_configs!}
      commit_messages_configs={settings_data_hook.commit_messages_configs!}
      edit_context_configs={settings_data_hook.edit_context_configs!}
      intelligent_update_configs={
        settings_data_hook.intelligent_update_configs!
      }
      commit_message_instructions={
        settings_data_hook.commit_message_instructions!
      }
      set_providers={settings_data_hook.set_providers}
      set_code_completions_configs={
        settings_data_hook.set_code_completions_configs
      }
      set_commit_messages_configs={
        settings_data_hook.set_commit_messages_configs
      }
      set_edit_context_configs={settings_data_hook.set_edit_context_configs}
      set_intelligent_update_configs={
        settings_data_hook.set_intelligent_update_configs
      }
      on_commit_instructions_change={(instructions) =>
        post_message(vscode, {
          command: 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS',
          instructions
        })
      }
      on_open_editor_settings={() =>
        post_message(vscode, { command: 'OPEN_EDITOR_SETTINGS' })
      }
      on_reorder_providers={handle_reorder_providers}
      on_add_provider={handle_add_provider}
      on_delete_provider={handle_delete_provider}
      on_rename_provider={handle_rename_provider}
      on_change_api_key={handle_change_api_key}
      on_add_config={handle_add_config}
      on_reorder_configs={handle_reorder_configs}
      on_edit_config={handle_edit_config}
      on_delete_config={handle_delete_config}
      on_set_default_config={handle_set_default_config}
      on_unset_default_config={handle_unset_default_config}
      scroll_to_section_on_load={scroll_to_section_on_load}
    />
  )
}
