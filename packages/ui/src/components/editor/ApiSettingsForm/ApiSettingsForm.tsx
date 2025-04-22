import React, { useState } from 'react'
import styles from './ApiSettingsForm.module.scss'
import { Field } from '../Field'
import { IconButton } from '../IconButton/IconButton'

type Provider = 'Gemini API' | 'OpenRouter'

type ApiToolSettings = {
  provider?: Provider
  model?: string
  temperature?: number
}

type Props = {
  gemini_api_models: {
    [model_id: string]: string
  }

  open_router_models: {
    [model_id: string]: {
      name: string
      description: string
    }
  }

  gemini_api_key?: string
  open_router_api_key?: string

  code_completions_settings: ApiToolSettings
  file_refactoring_settings: ApiToolSettings
  apply_chat_response_settings: ApiToolSettings
  commit_message_settings: ApiToolSettings

  on_code_completions_settings_update: (settings: ApiToolSettings) => void
  on_file_refactoring_settings_update: (settings: ApiToolSettings) => void
  on_apply_chat_response_settings_update: (settings: ApiToolSettings) => void
  on_commit_message_settings_update: (settings: ApiToolSettings) => void

  get_newly_picked_open_router_model: () => Promise<string | undefined>
  on_gemini_api_key_change: (api_key: string) => void
  on_open_router_api_key_change: (api_key: string) => void

  // Deprecated:
  // default_code_completion_model: string
  // default_refactoring_model: string
  // default_apply_changes_model: string
  // default_commit_message_model: string

  // model_options: string[]
  // on_fim_model_change: (model: string) => void
  // on_refactoring_model_change: (model: string) => void
  // on_apply_changes_model_change: (model: string) => void
  // on_commit_message_model_change: (model: string) => void
}

export const ApiSettingsForm: React.FC<Props> = (props) => {
  const [show_gemini_api_key, set_show_api_key] = useState(false)
  const [show_open_router_api_key, set_show_open_router_api_key] =
    useState(false)

  const toggle_gemini_api_key_visibility = () => {
    set_show_api_key(!show_gemini_api_key)
  }
  const toggle_open_router_api_key_visibility = () => {
    set_show_open_router_api_key(!show_open_router_api_key)
  }

  return (
    <div className={styles.form}>
      <Field
        label="Gemini API Key"
        htmlFor="gemini-api-key"
        info={
          !props.gemini_api_key && (
            <>
              Create yours in{' '}
              <a href="https://aistudio.google.com/app/apikey">AI Studio</a>.
            </>
          )
        }
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            id="gemini-api-key"
            type={show_gemini_api_key ? 'text' : 'password'}
            value={props.gemini_api_key}
            onChange={(e) => props.on_gemini_api_key_change(e.target.value)}
            className={styles.input}
            placeholder="Enter your API key"
            style={{ flex: 1 }}
          />
          <IconButton
            codicon_icon={show_gemini_api_key ? 'eye-closed' : 'eye'}
            on_click={toggle_gemini_api_key_visibility}
            title={show_gemini_api_key ? 'Hide API key' : 'Show API key'}
          />
        </div>
      </Field>

      <Field
        label="Open Router API Key"
        htmlFor="open-router-api-key"
        info={
          !props.open_router_api_key && (
            <>
              Create yours in{' '}
              <a href="https://openrouter.ai/settings/keys">
                Open Router Settings
              </a>
              .
            </>
          )
        }
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            id="open-router-api-key"
            type={show_open_router_api_key ? 'text' : 'password'}
            value={props.open_router_api_key}
            onChange={(e) =>
              props.on_open_router_api_key_change(e.target.value)
            }
            className={styles.input}
            placeholder="Enter your API key"
            style={{ flex: 1 }}
          />
          <IconButton
            codicon_icon={show_open_router_api_key ? 'eye-closed' : 'eye'}
            on_click={toggle_open_router_api_key_visibility}
            title={show_open_router_api_key ? 'Hide API key' : 'Show API key'}
          />
        </div>
      </Field>

      {/* Code completions */}

      <Field label="Provider" htmlFor="code-completions-provider">
        <select
          id="code-completions-provider"
          value={props.code_completions_settings.provider}
          onChange={(e) => {
            props.on_code_completions_settings_update({
              ...props.code_completions_settings,
              provider: e.target.value as Provider
            })
          }}
          className={styles.input}
        >
          <option value="Gemini API">Gemini API</option>
          <option value="OpenRouter">OpenRouter</option>
        </select>
      </Field>

      <Field label="Model" htmlFor="code-completions-model">
        <div
          onClick={async () => {
            if (props.code_completions_settings.provider == 'OpenRouter') {
              const new_pick = await props.get_newly_picked_open_router_model()
              props.on_code_completions_settings_update({
                ...props.code_completions_settings,
                model: new_pick
              })
            }
          }}
        >
          <div
            style={{
              pointerEvents:
                props.code_completions_settings.provider == 'OpenRouter'
                  ? 'none'
                  : undefined
            }}
          >
            <select
              id="code-completions-model"
              value={props.code_completions_settings.model}
              onChange={(e) => {
                props.on_code_completions_settings_update({
                  ...props.on_code_completions_settings_update,
                  model: e.target.value
                })
              }}
              className={styles.input}
            >
              {props.code_completions_settings.provider == 'Gemini API' &&
                Object.entries(props.gemini_api_models).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              {props.code_completions_settings.provider == 'OpenRouter' &&
                Object.entries(props.open_router_models).map(
                  ([id, model_info]) => (
                    <option key={id} value={id}>
                      {model_info.name}
                    </option>
                  )
                )}
            </select>
          </div>
        </div>
      </Field>

      {/* <Field label="Refactoring Model" htmlFor="refactoring-model">
        <select
          id="refactoring-model"
          value={props.default_refactoring_model}
          onChange={(e) => props.on_refactoring_model_change(e.target.value)}
          className={styles.input}
        >
          {props.model_options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Apply Chat Response Model" htmlFor="apply-changes-model">
        <select
          id="apply-changes-model"
          value={props.default_apply_changes_model}
          onChange={(e) => props.on_apply_changes_model_change(e.target.value)}
          className={styles.input}
        >
          {props.model_options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Commit Messages Model" htmlFor="commit-message-model">
        <select
          id="commit-message-model"
          value={props.default_commit_message_model}
          onChange={(e) => props.on_commit_message_model_change(e.target.value)}
          className={styles.input}
        >
          {props.model_options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field> */}
    </div>
  )
}
