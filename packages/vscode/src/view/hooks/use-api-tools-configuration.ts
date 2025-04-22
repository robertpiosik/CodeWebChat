import { useEffect, useState } from 'react'
import {
  ExtensionMessage,
  GetGeminiApiKeyMessage,
  GetOpenRouterApiKeyMessage
} from '../types/messages'

type Provider = 'Gemini API' | 'OpenRouter'

type ApiToolSettings = {
  provider?: Provider
  model?: string
  temperature?: number
}

export const use_api_tools_configuration = (vscode: any) => {
  const [gemini_api_key, set_gemini_api_key] = useState('')
  const [open_router_api_key, set_open_router_api_key] = useState('')
  const [code_completions_settings, set_code_completions_settings] =
    useState<ApiToolSettings>({})
  const [file_refactoring_settings, set_file_refactoring_settings] =
    useState<ApiToolSettings>({})
  const [apply_chat_response_settings, set_apply_chat_response_settings] =
    useState<ApiToolSettings>({})

  useEffect(() => {
    vscode.postMessage({
      command: 'GET_GEMINI_API_KEY'
    } as GetGeminiApiKeyMessage)
    vscode.postMessage({
      command: 'GET_OPEN_ROUTER_API_KEY'
    } as GetOpenRouterApiKeyMessage)

    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'GEMINI_API_KEY_UPDATED') {
        set_gemini_api_key(message.api_key || '')
      } else if (message.command == 'OPEN_ROUTER_API_KEY_UPDATED') {
        set_open_router_api_key(message.api_key || '')
      }
    }
    window.addEventListener('message', handle_message)
  }, [])

  // handle_gemini_api_key_change
  const handle_gemini_api_key_change = (api_key: string) => {
    set_gemini_api_key(api_key)
    vscode.postMessage({
      command: 'UPDATE_GEMINI_API_KEY',
      api_key
    })
  }

  // handle_open_router_api_key_change
  const handle_open_router_api_key_change = (api_key: string) => {
    set_open_router_api_key(api_key)
    vscode.postMessage({
      command: 'UPDATE_OPEN_ROUTER_API_KEY',
      api_key
    })
  }

  return {
    gemini_api_key,
    open_router_api_key,
    handle_gemini_api_key_change,
    handle_open_router_api_key_change
  }
}
