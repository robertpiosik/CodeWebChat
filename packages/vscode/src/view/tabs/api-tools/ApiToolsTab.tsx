import { ApiSettingsForm } from '@ui/components/editor/ApiSettingsForm'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import styles from './ApiToolsTab.module.scss'
import React, { useState, useEffect } from 'react'
import { ExtensionMessage } from '@/view/types/messages'

type Props = {
  vscode: any
  is_visible: boolean
}

export const ApiToolsTab: React.FC<Props> = (props) => {
  const [api_key, set_api_key] = useState('')
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
      if (message.command == 'API_KEY_UPDATED') {
        set_api_key(message.api_key || '')
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
      command: 'GET_API_KEY'
    })
    props.vscode.postMessage({
      command: 'GET_DEFAULT_MODELS'
    })
    props.vscode.postMessage({
      command: 'GET_CUSTOM_PROVIDERS'
    })

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_api_key_change = (api_key: string) => {
    set_api_key(api_key)
    props.vscode.postMessage({
      command: 'UPDATE_API_KEY',
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

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <ApiSettingsForm
        api_key={api_key}
        default_code_completion_model={default_code_completion_model}
        default_refactoring_model={default_refactoring_model}
        default_apply_changes_model={default_apply_changes_model}
        default_commit_message_model={default_commit_message_model}
        model_options={model_options}
        on_api_key_change={handle_api_key_change}
        on_fim_model_change={handle_code_completion_model_change}
        on_refactoring_model_change={handle_refactoring_model_change}
        on_apply_changes_model_change={handle_apply_changes_model_change}
        on_commit_message_model_change={handle_commit_message_model_change}
      />
    </div>
  )
}
