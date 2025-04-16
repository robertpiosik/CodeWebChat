import React, { useState, useEffect } from 'react'
import styles from './EditPresetForm.module.scss'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'
import { Icon } from '../Icon'
import { Field } from '../Field'

const chatbot_to_icon = {
  'AI Studio': 'AI_STUDIO',
  Gemini: 'GEMINI',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  ChatGPT: 'CHATGPT',
  'GitHub Copilot': 'GITHUB_COPILOT',
  Claude: 'CLAUDE',
  DeepSeek: 'DEEPSEEK',
  Mistral: 'MISTRAL',
  Grok: 'GROK',
  HuggingChat: 'HUGGING_CHAT'
} as Record<string, Icon.Variant>

type Props = {
  preset: Preset
  on_update: (updated_preset: Preset) => void
}

export const EditPresetForm: React.FC<Props> = (props) => {
  const [chatbot, set_chatbot] = useState(props.preset.chatbot)
  const [name, set_name] = useState(props.preset.name)
  const [temperature, set_temperature] = useState(
    props.preset.temperature ||
      CHATBOTS[props.preset.chatbot].default_temperature == -1
      ? undefined
      : CHATBOTS[props.preset.chatbot].default_temperature
  )
  const [model, set_model] = useState(
    props.preset.model
      ? props.preset.model
      : Object.keys(CHATBOTS[props.preset.chatbot].models)[0] || undefined
  )
  const [system_instructions, set_system_instructions] = useState(
    props.preset.system_instructions ||
      CHATBOTS[props.preset.chatbot].default_system_instructions ||
      undefined
  )
  const [port, set_port] = useState(props.preset.port)

  const supports_temperature = CHATBOTS[chatbot].supports_custom_temperature
  const supports_system_instructions =
    CHATBOTS[chatbot].supports_system_instructions
  const supports_port = CHATBOTS[chatbot].supports_user_provided_port
  const supports_custom_model = CHATBOTS[chatbot].supports_user_provided_model
  const models = CHATBOTS[chatbot].models

  useEffect(() => {
    props.on_update({
      ...props.preset,
      name,
      chatbot,
      ...(supports_temperature ? { temperature } : {}),
      ...(model ? { model } : {}),
      ...(supports_system_instructions ? { system_instructions } : {}),
      ...(supports_port ? { port } : {})
    })
  }, [name, temperature, chatbot, model, system_instructions, port])

  const handle_chatbot_change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const new_chatbot = e.target.value as keyof typeof CHATBOTS
    set_chatbot(new_chatbot)
    set_model(Object.keys(CHATBOTS[new_chatbot].models)[0] || undefined)
    set_port(undefined)
    set_temperature(
      CHATBOTS[new_chatbot].default_temperature == -1
        ? undefined
        : CHATBOTS[new_chatbot].default_temperature
    )
    if (CHATBOTS[new_chatbot].supports_system_instructions) {
      set_system_instructions(CHATBOTS[new_chatbot].default_system_instructions)
    } else {
      set_system_instructions(undefined)
    }
  }

  return (
    <div className={styles.form}>
      <div className={styles['chatbot-icon']}>
        <Icon variant={chatbot_to_icon[chatbot]} />
      </div>

      <Field label="Chatbot" htmlFor="preset-chatbot">
        <select
          id="preset-chatbot"
          value={chatbot}
          onChange={handle_chatbot_change}
          className={styles.input}
        >
          {Object.keys(CHATBOTS).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Name" htmlFor="preset-name">
        <input
          id="preset-name"
          type="text"
          value={name}
          onChange={(e) => set_name(e.target.value)}
          className={styles.input}
        />
      </Field>

      {Object.keys(models).length > 0 && (
        <Field label="Model" htmlFor="preset-model">
          <select
            id="preset-model"
            value={model}
            onChange={(e) => set_model(e.target.value)}
            className={styles.input}
          >
            {Object.entries(models).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {supports_custom_model && (
        <Field label="Model" htmlFor="preset-custom-model">
          <input
            id="preset-custom-model"
            type="text"
            value={model || ''}
            onChange={(e) => set_model(e.target.value)}
            className={styles.input}
            placeholder="Enter model name"
          />
        </Field>
      )}

      {supports_port && (
        <Field
          label="Port"
          htmlFor="preset-port"
          info={
            chatbot == 'Open WebUI' && (
              <>
                Left empty will open <code>http://openwebui/</code>.
              </>
            )
          }
        >
          <input
            id="preset-port"
            type="text"
            value={port}
            onChange={(e) => set_port(parseInt(e.target.value))}
            className={styles.input}
            placeholder="e.g. 3000"
            onKeyDown={
              (e) =>
                !/[0-9]/.test(e.key) &&
                e.key != 'Backspace' &&
                e.preventDefault() // This way we don't see arrows up/down
            }
          />
        </Field>
      )}

      {supports_temperature && (
        <Field label="Temperature" htmlFor="preset-temperature">
          <div className={styles.temperature}>
            <input
              id="preset-temperature"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={temperature}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                if (!isNaN(value) && value >= 0 && value <= 1) {
                  set_temperature(value)
                }
              }}
              className={cn(styles.input, styles.temperature__input)}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={temperature}
              onChange={(e) => set_temperature(parseFloat(e.target.value))}
              className={styles.temperature__slider}
            />
          </div>
        </Field>
      )}

      {supports_system_instructions && (
        <Field label="System Instructions" htmlFor="system-instructions">
          <TextareaAutosize
            id="system-instructions"
            value={system_instructions}
            onChange={(e) => set_system_instructions(e.target.value)}
            className={styles.input}
            minRows={4}
            placeholder="Optional tone and style instructions for the model"
          />
        </Field>
      )}
    </div>
  )
}
