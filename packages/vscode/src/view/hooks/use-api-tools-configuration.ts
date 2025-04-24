import { useEffect, useState } from 'react'
import {
  ExtensionMessage,
  GetGeminiApiKeyMessage,
  GetOpenRouterApiKeyMessage,
  GetCodeCompletionsSettingsMessage,
  GetFileRefactoringSettingsMessage,
  GetApplyChatResponseSettingsMessage,
  GetCommitMessagesSettingsMessage
} from '../types/messages'
import { ApiToolSettings } from '@shared/types/api-tool-settings'

export const use_api_tools_configuration = (vscode: any) => {
  const [gemini_api_key, set_gemini_api_key] = useState('')
  const [open_router_api_key, set_open_router_api_key] = useState('')
  const [code_completions_settings, set_code_completions_settings] =
    useState<ApiToolSettings>()
  const [file_refactoring_settings, set_file_refactoring_settings] =
    useState<ApiToolSettings>()
  const [apply_chat_response_settings, set_apply_chat_response_settings] =
    useState<ApiToolSettings>()
  const [commit_message_settings, set_commit_message_settings] =
    useState<ApiToolSettings>()

  useEffect(() => {
    vscode.postMessage({
      command: 'GET_GEMINI_API_KEY'
    } as GetGeminiApiKeyMessage)
    vscode.postMessage({
      command: 'GET_OPEN_ROUTER_API_KEY'
    } as GetOpenRouterApiKeyMessage)
    vscode.postMessage({
      command: 'GET_CODE_COMPLETIONS_SETTINGS'
    } as GetCodeCompletionsSettingsMessage)
    vscode.postMessage({
      command: 'GET_FILE_REFACTORING_SETTINGS'
    } as GetFileRefactoringSettingsMessage)
    vscode.postMessage({
      command: 'GET_APPLY_CHAT_RESPONSE_SETTINGS'
    } as GetApplyChatResponseSettingsMessage)
    vscode.postMessage({
      command: 'GET_COMMIT_MESSAGES_SETTINGS'
    } as GetCommitMessagesSettingsMessage)

    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'GEMINI_API_KEY') {
        set_gemini_api_key(message.api_key || '')
      } else if (message.command == 'OPEN_ROUTER_API_KEY') {
        set_open_router_api_key(message.api_key || '')
      } else if (message.command == 'CODE_COMPLETIONS_SETTINGS') {
        set_code_completions_settings(message.settings)
      } else if (message.command == 'FILE_REFACTORING_SETTINGS') {
        set_file_refactoring_settings(message.settings)
      } else if (message.command == 'APPLY_CHAT_RESPONSE_SETTINGS') {
        set_apply_chat_response_settings(message.settings)
      } else if (message.command == 'COMMIT_MESSAGES_SETTINGS') {
        set_commit_message_settings(message.settings)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_gemini_api_key_change = (api_key: string) => {
    set_gemini_api_key(api_key)
    vscode.postMessage({
      command: 'UPDATE_GEMINI_API_KEY',
      api_key
    })
  }

  const handle_open_router_api_key_change = (api_key: string) => {
    set_open_router_api_key(api_key)
    vscode.postMessage({
      command: 'UPDATE_OPEN_ROUTER_API_KEY',
      api_key
    })
  }

  const handle_code_completions_settings_change = (
    settings: ApiToolSettings
  ) => {
    set_code_completions_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_CODE_COMPLETIONS_SETTINGS',
      settings
    })
  }

  const handle_file_refactoring_settings_change = (
    settings: ApiToolSettings
  ) => {
    set_file_refactoring_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_FILE_REFACTORING_SETTINGS',
      settings
    })
  }

  const handle_apply_chat_response_settings_change = (
    settings: ApiToolSettings
  ) => {
    set_apply_chat_response_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_APPLY_CHAT_RESPONSE_SETTINGS',
      settings
    })
  }

  const handle_commit_message_settings_change = (settings: ApiToolSettings) => {
    set_commit_message_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_COMMIT_MESSAGES_SETTINGS',
      settings
    })
  }

  return {
    gemini_api_key,
    open_router_api_key,
    code_completions_settings,
    file_refactoring_settings,
    apply_chat_response_settings,
    commit_message_settings,
    handle_gemini_api_key_change,
    handle_open_router_api_key_change,
    handle_code_completions_settings_change,
    handle_file_refactoring_settings_change,
    handle_apply_chat_response_settings_change,
    handle_commit_message_settings_change
  }
}
