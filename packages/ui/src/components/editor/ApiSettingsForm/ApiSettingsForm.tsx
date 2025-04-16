import React, { useState } from 'react'
import styles from './ApiSettingsForm.module.scss'
import { Field } from '../Field'
import { IconButton } from '../IconButton/IconButton'

type Props = {
  api_key: string
  default_code_completion_model: string
  default_refactoring_model: string
  default_apply_changes_model: string
  default_commit_message_model: string
  model_options: string[]
  on_api_key_change: (api_key: string) => void
  on_fim_model_change: (model: string) => void
  on_refactoring_model_change: (model: string) => void
  on_apply_changes_model_change: (model: string) => void
  on_commit_message_model_change: (model: string) => void
}

export const ApiSettingsForm: React.FC<Props> = (props) => {
  const [show_api_key, set_show_api_key] = useState(false)

  const handle_api_key_visibility = () => {
    set_show_api_key(!show_api_key)
  }

  return (
    <div className={styles.form}>
      <Field
        label="Gemini API Key"
        htmlFor="api-key"
        info={
          !props.api_key && (
            <>
              Create yours in{' '}
              <a href="https://aistudio.google.com/app/apikey">AI Studio</a>.
            </>
          )
        }
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="api-key"
            type={show_api_key ? 'text' : 'password'}
            value={props.api_key}
            onChange={(e) => props.on_api_key_change(e.target.value)}
            className={styles.input}
            placeholder="Enter your API key"
            style={{ flex: 1 }}
          />
          <IconButton
            codicon_icon={show_api_key ? 'eye-closed' : 'eye'}
            on_click={handle_api_key_visibility}
            title={show_api_key ? 'Hide API key' : 'Show API key'}
          />
        </div>
      </Field>

      <Field label="Code Completions Model" htmlFor="code-completions-model">
        <select
          id="code-completions-model"
          value={props.default_code_completion_model}
          onChange={(e) => props.on_fim_model_change(e.target.value)}
          className={styles.input}
        >
          {props.model_options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Refactoring Model" htmlFor="refactoring-model">
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

      <Field label="Apply Changes Model" htmlFor="apply-changes-model">
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
      </Field>
    </div>
  )
}
