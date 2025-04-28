import React, { useState, useEffect } from 'react'
import styles from './EditPresetForm.module.scss'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import TextareaAutosize from 'react-textarea-autosize'
import { Icon } from '../Icon'
import { Field } from '../Field'
import { chatbot_to_icon } from '../../../constants/chatbot-to-icon'
import { TemperatureControl } from '../TemperatureControl'

type Props = {
  preset: Preset
  on_update: (updated_preset: Preset) => void
  request_open_router_models: () => void
  open_router_models: {
    [model_id: string]: {
      name: string
      description: string
    }
  }
  get_newly_picked_open_router_model: () => Promise<string | undefined>
}

export const EditPresetForm: React.FC<Props> = (props) => {
  const [chatbot, set_chatbot] = useState(props.preset.chatbot)
  const [name, set_name] = useState(props.preset.name)
  const [temperature, set_temperature] = useState(props.preset.temperature)
  const [model, set_model] = useState(props.preset.model)
  const [system_instructions, set_system_instructions] = useState(
    props.preset.system_instructions
  )
  const [port, set_port] = useState(props.preset.port)
  const [prompt_prefix, set_prompt_prefix] = useState(
    props.preset.prompt_prefix
  )
  const [prompt_suffix, set_prompt_suffix] = useState(
    props.preset.prompt_suffix
  )
  const [options, set_options] = useState<string[]>(props.preset.options || [])
  const [open_router_models, set_open_router_models] = useState<{
    [model_id: string]: {
      name: string
      description: string
    }
  }>({})

  const supports_temperature = CHATBOTS[chatbot].supports_custom_temperature
  const supports_system_instructions =
    CHATBOTS[chatbot].supports_system_instructions
  const supports_port = CHATBOTS[chatbot].supports_user_provided_port
  const supports_user_provided_model =
    CHATBOTS[chatbot].supports_user_provided_model
  const models = CHATBOTS[chatbot].models
  const supported_options = CHATBOTS[chatbot].supported_options

  useEffect(() => {
    props.on_update({
      name,
      chatbot,
      ...(prompt_prefix ? { prompt_prefix } : {}),
      ...(prompt_suffix ? { prompt_suffix } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(model ? { model } : {}),
      ...(system_instructions ? { system_instructions } : {}),
      ...(port !== undefined ? { port } : {}),
      ...(options.length ? { options } : {})
    })
  }, [
    name,
    temperature,
    chatbot,
    model,
    system_instructions,
    port,
    prompt_prefix,
    prompt_suffix,
    options
  ])

  const handle_chatbot_change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const new_chatbot = e.target.value as keyof typeof CHATBOTS
    set_chatbot(new_chatbot)
    set_model(Object.keys(CHATBOTS[new_chatbot].models)[0] || undefined)
    set_port(undefined)
    set_temperature(
      CHATBOTS[new_chatbot].supports_custom_temperature ? 0.5 : undefined
    )
    if (CHATBOTS[new_chatbot].supports_system_instructions) {
      set_system_instructions(CHATBOTS[new_chatbot].default_system_instructions)
    } else {
      set_system_instructions(undefined)
    }
    set_options([])
  }

  const handle_option_toggle = (option: string) => {
    set_options((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o != option)
        : [...prev, option]
    )
  }

  useEffect(() => {
    if (chatbot == 'OpenRouter') {
      // Use stale-while-revalidate technique
      props.request_open_router_models()
    }
  }, [chatbot])

  useEffect(() => {
    set_open_router_models(props.open_router_models)
  }, [props.open_router_models])

  return (
    <div className={styles.form}>
      <div className={styles['chatbot-icon']}>
        <Icon variant={chatbot_to_icon[chatbot]} />
      </div>

      <Field label="Chatbot" htmlFor="chatbot">
        <select id="chatbot" value={chatbot} onChange={handle_chatbot_change}>
          {Object.keys(CHATBOTS).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </Field>

      {Object.keys(models).length > 0 && (
        <Field label="Model" htmlFor="model">
          <select
            id="model"
            value={model}
            onChange={(e) => set_model(e.target.value)}
          >
            {Object.entries(models).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {chatbot == 'OpenRouter' &&
        (Object.keys(open_router_models).length > 0 ? (
          <Field label="Model" htmlFor="open-router-model">
            <div
              onClick={async () => {
                const new_pick =
                  await props.get_newly_picked_open_router_model()
                set_model(new_pick)
              }}
            >
              <div style={{ cursor: 'pointer' }}>
                <div style={{ pointerEvents: 'none' }}>
                  <select
                    id="open-router-model"
                    value={model}
                    onChange={(e) => set_model(e.target.value)}
                    onClick={(e) => {
                      e.preventDefault()
                    }}
                  >
                    {Object.entries(open_router_models).map(
                      ([value, model]) => (
                        <option key={value} value={value}>
                          {model.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          </Field>
        ) : (
          <Field label="Model">
            <select value="fetching" disabled>
              <option value="fetching">Fetching models...</option>
            </select>
          </Field>
        ))}

      {supports_user_provided_model && (
        <Field label="Model" htmlFor="custom-model">
          <input
            id="custom-model"
            type="text"
            value={model || ''}
            onChange={(e) => set_model(e.target.value)}
            placeholder="Enter model name"
          />
        </Field>
      )}

      <Field label="Name" htmlFor="name">
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => set_name(e.target.value)}
        />
      </Field>

      {supports_port && (
        <Field
          label="Port"
          htmlFor="port"
          info={
            chatbot == 'Open WebUI' && (
              <>
                Used for localhost. For networked instances leave empty and
                setup a proxy server for <code>http://openwebui/</code>.
              </>
            )
          }
        >
          <input
            id="port"
            type="text"
            value={port}
            onChange={(e) => set_port(parseInt(e.target.value))}
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

      {Object.keys(supported_options).length > 0 && (
        <Field label="Options">
          <div className={styles.options}>
            {Object.entries(supported_options).map(([key, label]) => (
              <label key={key} className={styles.options__item}>
                <input
                  type="checkbox"
                  checked={options.includes(key)}
                  onChange={() => handle_option_toggle(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
      )}

      {supports_temperature && (
        <Field label="Temperature" htmlFor="temperature">
          <TemperatureControl
            value={temperature || 0}
            onChange={set_temperature}
          />
        </Field>
      )}

      {supports_system_instructions && (
        <Field label="System Instructions" htmlFor="instructions">
          <TextareaAutosize
            id="instructions"
            value={system_instructions}
            onChange={(e) => set_system_instructions(e.target.value)}
            minRows={4}
            placeholder="Optional tone and style instructions for the model"
          />
        </Field>
      )}

      <Field
        label="Prompt Prefix"
        htmlFor="prefix"
        info="Text prepended to prompts used with this preset"
      >
        <input
          id="prefix"
          type="text"
          value={prompt_prefix}
          onChange={(e) => set_prompt_prefix(e.target.value)}
        />
      </Field>

      <Field
        label="Prompt Suffix"
        htmlFor="suffix"
        info="Text appended to prompts used with this preset"
      >
        <input
          id="suffix"
          type="text"
          value={prompt_suffix}
          onChange={(e) => set_prompt_suffix(e.target.value)}
        />
      </Field>
    </div>
  )
}
