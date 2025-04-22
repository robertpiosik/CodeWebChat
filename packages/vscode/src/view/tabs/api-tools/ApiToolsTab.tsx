import { ApiSettingsForm } from '@ui/components/editor/ApiSettingsForm'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import styles from './ApiToolsTab.module.scss'
import React, { useState, useEffect } from 'react'
import {
  ExtensionMessage,
  GetCustomProvidersMessage,
  GetDefaultModelsMessage,
  GetGeminiApiKeyMessage,
  GetOpenRouterApiKeyMessage
} from '@/view/types/messages'

type Provider = 'Gemini API' | 'OpenRouter'

type ApiToolSettings = {
  provider?: Provider
  model?: string
  temperature?: number
}

type Props = {
  vscode: any
  is_visible: boolean
}

export const ApiToolsTab: React.FC<Props> = (props) => {
  const [gemini_api_key, set_gemini_api_key] = useState('')
  const [open_router_api_key, set_open_router_api_key] = useState('')
  const [code_completions_settings, set_code_completions_settings] =
    useState<ApiToolSettings>({})
  const [file_refactoring_settings, set_file_refactoring_settings] =
    useState<ApiToolSettings>({})
  const [apply_chat_response_settings, set_apply_chat_response_settings] =
    useState<ApiToolSettings>({})

  const [gemini_api_models, set_gemini_api_models] = useState<{
    [model_id: string]: string
  }>({})
  const [open_router_models, set_open_router_models] = useState<{
    [model_id: string]: {
      name: string
      description: string
    }
  }>({})

  const [default_code_completion_model, set_default_code_completion_model] =
    useState('')
  const [default_refactoring_model, set_default_refactoring_model] =
    useState('')
  const [default_apply_changes_model, set_default_apply_changes_model] =
    useState('')
  const [default_commit_message_model, set_default_commit_message_model] =
    useState('')

  const [model_options, set_model_options] = useState<string[]>([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'GEMINI_API_KEY_UPDATED') {
        set_gemini_api_key(message.api_key || '')
      } else if (message.command == 'OPEN_ROUTER_API_KEY_UPDATED') {
        set_open_router_api_key(message.api_key || '')
      } else if (message.command == 'DEFAULT_MODELS_UPDATED') {
        if (message.default_code_completion_model) {
          set_default_code_completion_model(
            message.default_code_completion_model
          )
        }
        if (message.default_refactoring_model) {
          set_default_refactoring_model(message.default_refactoring_model)
        }
        if (message.default_apply_changes_model) {
          set_default_apply_changes_model(message.default_apply_changes_model)
        }
        if (message.default_commit_message_model) {
          set_default_commit_message_model(message.default_commit_message_model)
        }
      } else if (
        message.command == 'CUSTOM_PROVIDERS_UPDATED' &&
        message.custom_providers
      ) {
        const all_providers = [
          ...BUILT_IN_PROVIDERS.map((provider) => provider.name),
          ...message.custom_providers.map((provider) => provider.name)
        ]
        set_model_options(all_providers)
      }
    }

    window.addEventListener('message', handle_message)
    props.vscode.postMessage({
      command: 'GET_GEMINI_API_KEY'
    } as GetGeminiApiKeyMessage)
    props.vscode.postMessage({
      command: 'GET_OPEN_ROUTER_API_KEY'
    } as GetOpenRouterApiKeyMessage)
    props.vscode.postMessage({
      command: 'GET_DEFAULT_MODELS'
    } as GetDefaultModelsMessage)
    props.vscode.postMessage({
      command: 'GET_CUSTOM_PROVIDERS'
    } as GetCustomProvidersMessage)

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_gemini_api_key_change = (api_key: string) => {
    set_gemini_api_key(api_key)
    props.vscode.postMessage({
      command: 'UPDATE_GEMINI_API_KEY',
      api_key
    })
  }

  const handle_open_router_api_key_change = (api_key: string) => {
    set_open_router_api_key(api_key)
    props.vscode.postMessage({
      command: 'UPDATE_OPEN_ROUTER_API_KEY',
      api_key
    })
  }

  const handle_code_completion_model_change = (model: string) => {
    props.vscode.postMessage({
      command: 'UPDATE_DEFAULT_MODEL',
      model_type: 'code_completion',
      model
    })
  }

  const handle_refactoring_model_change = (model: string) => {
    props.vscode.postMessage({
      command: 'UPDATE_DEFAULT_MODEL',
      model_type: 'refactoring',
      model
    })
  }

  const handle_apply_changes_model_change = (model: string) => {
    props.vscode.postMessage({
      command: 'UPDATE_DEFAULT_MODEL',
      model_type: 'apply_changes',
      model
    })
  }

  const handle_commit_message_model_change = (model: string) => {
    props.vscode.postMessage({
      command: 'UPDATE_DEFAULT_MODEL',
      model_type: 'commit_message',
      model
    })
  }

  // new handlers leave empty bodies now
  const handle_code_completions_settings_update = (
    settings: ApiToolSettings
  ) => {}

  const handle_file_refactoring_settings_update = (
    settings: ApiToolSettings
  ) => {}

  const handle_apply_chat_response_settings_update = (
    settings: ApiToolSettings
  ) => {}

  const get_newly_picked_open_router_model = async (): Promise<
    string | undefined
  > => {
    return undefined
  }

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <ApiSettingsForm
        gemini_api_models={gemini_api_models}
        open_router_models={open_router_models}
        gemini_api_key={gemini_api_key}
        open_router_api_key={open_router_api_key}
        //
        code_completions_settings={code_completions_settings}
        file_refactoring_settings={file_refactoring_settings}
        apply_chat_response_settings={apply_chat_response_settings}
        on_code_completions_settings_update={
          handle_code_completions_settings_update
        }
        on_file_refactoring_settings_update={
          handle_file_refactoring_settings_update
        }
        on_apply_chat_response_settings_update={
          handle_apply_chat_response_settings_update
        }
        get_newly_picked_open_router_model={get_newly_picked_open_router_model}
        //
        default_code_completion_model={default_code_completion_model}
        default_refactoring_model={default_refactoring_model}
        default_apply_changes_model={default_apply_changes_model}
        default_commit_message_model={default_commit_message_model}
        model_options={model_options}
        on_gemini_api_key_change={handle_gemini_api_key_change}
        on_open_router_api_key_change={handle_open_router_api_key_change}
        on_fim_model_change={handle_code_completion_model_change}
        on_refactoring_model_change={handle_refactoring_model_change}
        on_apply_changes_model_change={handle_apply_changes_model_change}
        on_commit_message_model_change={handle_commit_message_model_change}
      />
    </div>
  )
}
