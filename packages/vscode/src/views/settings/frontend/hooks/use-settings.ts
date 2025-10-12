import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient,
  ProviderForClient,
  FrontendMessage
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'

export const use_settings = (vscode: any) => {
  const [providers, set_providers] = useState<ProviderForClient[] | undefined>(
    undefined
  )
  const [code_completions_configs, set_code_completions_configs] = useState<
    ConfigurationForClient[] | undefined
  >(undefined)
  const [commit_messages_configs, set_commit_messages_configs] = useState<
    ConfigurationForClient[] | undefined
  >(undefined)
  const [edit_context_configs, set_edit_context_configs] = useState<
    ConfigurationForClient[] | undefined
  >(undefined)
  const [intelligent_update_configs, set_intelligent_update_configs] = useState<
    ConfigurationForClient[] | undefined
  >(undefined)
  const [commit_message_instructions, set_commit_message_instructions] =
    useState<string | undefined>(undefined)

  useEffect(() => {
    // Request initial data
    post_message(vscode, { command: 'GET_MODEL_PROVIDERS' })
    post_message(vscode, { command: 'GET_CODE_COMPLETIONS_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_COMMIT_MESSAGES_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_EDIT_CONTEXT_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_COMMIT_MESSAGE_INSTRUCTIONS' })
  }, [vscode])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      switch (message.command) {
        case 'MODEL_PROVIDERS':
          set_providers(message.providers)
          break
        case 'CODE_COMPLETIONS_CONFIGURATIONS':
          set_code_completions_configs(message.configurations)
          break
        case 'COMMIT_MESSAGES_CONFIGURATIONS':
          set_commit_messages_configs(message.configurations)
          break
        case 'EDIT_CONTEXT_CONFIGURATIONS':
          set_edit_context_configs(message.configurations)
          break
        case 'INTELLIGENT_UPDATE_CONFIGURATIONS':
          set_intelligent_update_configs(message.configurations)
          break
        case 'COMMIT_MESSAGE_INSTRUCTIONS':
          set_commit_message_instructions(message.instructions)
          break
      }
    }

    window.addEventListener('message', handle_message)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  const handle_reorder_providers = (
    reordered_providers: ProviderForClient[]
  ) => {
    set_providers(reordered_providers)
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

  const handle_commit_instructions_change = (instructions: string) =>
    post_message(vscode, {
      command: 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS',
      instructions
    })

  const handle_open_editor_settings = () =>
    post_message(vscode, { command: 'OPEN_EDITOR_SETTINGS' })

  return {
    providers,
    set_providers,
    code_completions_configs,
    set_code_completions_configs,
    commit_messages_configs,
    set_commit_messages_configs,
    edit_context_configs,
    set_edit_context_configs,
    intelligent_update_configs,
    set_intelligent_update_configs,
    commit_message_instructions,
    handle_reorder_providers,
    handle_add_provider,
    handle_delete_provider,
    handle_rename_provider,
    handle_change_api_key,
    handle_add_config,
    handle_reorder_configs,
    handle_edit_config,
    handle_delete_config,
    handle_set_default_config,
    handle_unset_default_config,
    handle_commit_instructions_change,
    handle_open_editor_settings
  }
}
