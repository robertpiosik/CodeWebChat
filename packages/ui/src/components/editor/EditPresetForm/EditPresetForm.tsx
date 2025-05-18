import React, { useState, useEffect } from 'react'
import styles from './EditPresetForm.module.scss'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import TextareaAutosize from 'react-textarea-autosize'
import { Icon } from '../Icon'
import { Field } from '../Field'
import { chatbot_to_icon } from '../../../constants/chatbot-to-icon'
import { Slider } from '../Slider'

type Props = {
  preset: Preset
  on_update: (updated_preset: Preset) => void
  pick_open_router_model: () => void
}

export const EditPresetForm: React.FC<Props> = (props) => {
  const [chatbot, set_chatbot] = useState(props.preset.chatbot)
  const [name, set_name] = useState(props.preset.name)
  const [temperature, set_temperature] = useState(props.preset.temperature)
  const [top_p, set_top_p] = useState(props.preset.top_p)
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

  const supports_temperature = CHATBOTS[chatbot].supports_custom_temperature
  const supports_top_p = CHATBOTS[chatbot].supports_custom_top_p
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
      ...(top_p !== CHATBOTS[chatbot].default_top_p ? { top_p } : {}),
      ...(model ? { model } : {}),
      ...(system_instructions ? { system_instructions } : {}),
      ...(port !== undefined ? { port } : {}),
      ...(options.length ? { options } : {})
    })
  }, [
    name,
    temperature,
    top_p,
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
    set_top_p(undefined)
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
    const handle_message = (event: MessageEvent) => {
      const message = event.data
      if (message.command == 'NEWLY_PICKED_OPEN_ROUTER_MODEL') {
        set_model(message.model_id)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return (
    <div className={styles.form}>
      <div className={styles['chatbot-icon']}>
        <Icon variant={chatbot_to_icon[chatbot]} />
      </div>

      <Field label="Chatbot" html_for="chatbot">
        <select id="chatbot" value={chatbot} onChange={handle_chatbot_change}>
          {Object.keys(CHATBOTS).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </Field>

      {Object.keys(models).length > 0 && (
        <Field label="Model" html_for="model">
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

      {chatbot == 'OpenRouter' && (
        <Field label="Model" html_for="open-router-model">
          <div
            onClick={(e) => {
              e.stopPropagation()
              props.pick_open_router_model()
            }}
          >
            <div style={{ cursor: 'pointer' }}>
              <div style={{ pointerEvents: 'none' }}>
                <select
                  id="open-router-model"
                  value={model}
                >
                  {model ? (
                    <option value={model}>{model}</option>
                  ) : (
                    <option value="">Select model</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </Field>
      )}

      {supports_user_provided_model && (
        <Field label="Model" html_for="custom-model">
          <input
            id="custom-model"
            type="text"
            value={model || ''}
            onChange={(e) => set_model(e.target.value)}
            placeholder="Enter model name"
          />
        </Field>
      )}

      <Field label="Name" html_for="name">
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
          html_for="port"
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

      {supports_temperature && temperature !== undefined && (
        <Field
          label="Temperature"
          title="This setting influences the variety in the model's responses. Lower values lead to more predictable and typical responses, while higher values encourage more diverse and less common responses. At 0, the model always gives the same response for a given input."
        >
          <Slider value={temperature} onChange={set_temperature} />
        </Field>
      )}

      {supports_top_p && (
        <Field
          label="Top P"
          title="This setting limits the model's choices to a percentage of likely tokens: only the top tokens whose probabilities add up to P. A lower value makes the model's responses more predictable, while the default setting allows for a full range of token choices. Think of it like a dynamic Top-K."
        >
          <Slider
            value={top_p || CHATBOTS[chatbot].default_top_p}
            onChange={set_top_p}
          />
        </Field>
      )}

      {supports_system_instructions && (
        <Field label="System Instructions" html_for="instructions">
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
        html_for="prefix"
        info="Text prepended to prompts used with this preset"
      >
        <textarea
          id="prefix"
          value={prompt_prefix}
          onChange={(e) => set_prompt_prefix(e.target.value)}
        />
      </Field>

      <Field
        label="Prompt Suffix"
        html_for="suffix"
        info="Text appended to prompts used with this preset"
      >
        <textarea
          id="suffix"
          value={prompt_suffix}
          onChange={(e) => set_prompt_suffix(e.target.value)}
        />
      </Field>
    </div>
  )
}
