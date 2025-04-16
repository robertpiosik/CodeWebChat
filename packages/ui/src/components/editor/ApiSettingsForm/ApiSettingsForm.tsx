import React from 'react'
import styles from './ApiSettingsForm.module.scss'
import cn from 'classnames'
import { Field } from '../Field'

type ModelOption = {
  name: string
  value: string
}

type Props = {
  api_key: string
  default_fim_model: string
  default_refactoring_model: string
  default_apply_changes_model: string
  default_commit_message_model: string
  model_options: ModelOption[]
  on_api_key_change: (api_key: string) => void
  on_fim_model_change: (model: string) => void
  on_refactoring_model_change: (model: string) => void
  on_apply_changes_model_change: (model: string) => void
  on_commit_message_model_change: (model: string) => void
}

export const ApiSettingsForm: React.FC<Props> = (props) => {
  return (
    <div className={styles.form}>
      <Field
        label="API Key"
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
        <input
          id="api-key"
          type="password"
          value={props.api_key}
          onChange={(e) => props.on_api_key_change(e.target.value)}
          className={styles.input}
          placeholder="Enter your API key"
        />
      </Field>

      <Field label="Default FIM Model" htmlFor="fim-model">
        <select
          id="fim-model"
          value={props.default_fim_model}
          onChange={(e) => props.on_fim_model_change(e.target.value)}
          className={cn(styles.input, styles.select)}
        >
          {props.model_options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Default Refactoring Model" htmlFor="refactoring-model">
        <select
          id="refactoring-model"
          value={props.default_refactoring_model}
          onChange={(e) => props.on_refactoring_model_change(e.target.value)}
          className={cn(styles.input, styles.select)}
        >
          {props.model_options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Default Apply Changes Model" htmlFor="apply-changes-model">
        <select
          id="apply-changes-model"
          value={props.default_apply_changes_model}
          onChange={(e) => props.on_apply_changes_model_change(e.target.value)}
          className={cn(styles.input, styles.select)}
        >
          {props.model_options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Default Commit Message Model"
        htmlFor="commit-message-model"
      >
        <select
          id="commit-message-model"
          value={props.default_commit_message_model}
          onChange={(e) => props.on_commit_message_model_change(e.target.value)}
          className={cn(styles.input, styles.select)}
        >
          {props.model_options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}
