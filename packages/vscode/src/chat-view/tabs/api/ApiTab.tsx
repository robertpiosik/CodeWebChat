import { ApiSettingsForm } from '@ui/components/editor/ApiSettingsForm'
import { BUILT_IN_PROVIDERS } from '@/constants/built-in-providers'
import styles from './ApiTab.module.scss'
import React, { useState, useEffect } from 'react'
import { ModelManager } from '@/services/model-manager'

type Props = {
  vscode: any
  is_visible: boolean
}

type ExtensionMessage = {
  command: string
  api_key?: string
}

export const ApiTab: React.FC<Props> = (props) => {
  const [api_key, set_api_key] = useState('')
  const [default_code_completion_model, set_default_code_completion_model] =
    useState('')
  const [default_refactoring_model, set_default_refactoring_model] =
    useState('')
  const [default_apply_changes_model, set_default_apply_changes_model] =
    useState('')
  const [default_commit_message_model, set_default_commit_message_model] =
    useState('')

  const model_options = BUILT_IN_PROVIDERS.map((provider) => ({
    name: provider.name,
    value: provider.name
  }))

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'API_KEY_UPDATED') {
        set_api_key(message.api_key || '')
      }
    }

    window.addEventListener('message', handle_message)
    props.vscode.postMessage({
      command: 'GET_API_KEY'
    })

    // Initialize model manager and get default models
    const model_manager = new ModelManager(props.vscode.context)
    set_default_code_completion_model(model_manager.get_default_fim_model())
    set_default_refactoring_model(model_manager.get_default_refactoring_model())
    set_default_apply_changes_model(
      model_manager.get_default_apply_changes_model()
    )
    set_default_commit_message_model(
      model_manager.get_default_commit_message_model()
    )

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  const handle_api_key_change = (api_key: string) => {
    set_api_key(api_key)
    props.vscode.postMessage({
      command: 'UPDATE_API_KEY',
      api_key
    })
  }

  const handle_code_completion_model_change = (model: string) => {
    const model_manager = new ModelManager(props.vscode.context)
    model_manager.set_default_code_completion_model(model)
    set_default_code_completion_model(model)
  }

  const handle_refactoring_model_change = (model: string) => {
    const model_manager = new ModelManager(props.vscode.context)
    model_manager.set_default_refactoring_model(model)
    set_default_refactoring_model(model)
  }

  const handle_apply_changes_model_change = (model: string) => {
    const model_manager = new ModelManager(props.vscode.context)
    model_manager.set_default_apply_changes_model(model)
    set_default_apply_changes_model(model)
  }

  const handle_commit_message_model_change = (model: string) => {
    const model_manager = new ModelManager(props.vscode.context)
    model_manager.set_default_commit_message_model(model)
    set_default_commit_message_model(model)
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
