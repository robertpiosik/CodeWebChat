import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient,
  ProviderForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'

export const use_settings_data = (vscode: any) => {
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

  useEffect(() => {
    // Request initial data
    post_message(vscode, { command: 'GET_MODEL_PROVIDERS' })
    post_message(vscode, { command: 'GET_CODE_COMPLETIONS_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_COMMIT_MESSAGES_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_EDIT_CONTEXT_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS' })
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
      }
    }

    window.addEventListener('message', handle_message)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

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
    set_intelligent_update_configs
  }
}
