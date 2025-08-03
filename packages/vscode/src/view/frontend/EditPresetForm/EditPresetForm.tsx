import React, { useState, useEffect, useRef } from 'react'
import styles from './EditPresetForm.module.scss'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import TextareaAutosize from 'react-textarea-autosize'
import { Field } from '@ui/components/editor/Field'
import { Slider } from '@ui/components/editor/Slider'
import { Button } from '@ui/components/editor/Button'
import { BackendMessage } from '@/view/types/messages'

type Props = {
  preset: Preset
  on_update: (updated_preset: Preset) => void
  on_save: () => void
  pick_open_router_model: () => void
  on_at_sign_in_affix: () => void
}

/**
 * Preset can have a "group" variant. It is used to:
 * - initialize all selected presets below it,
 * - add additional prefix and suffix to each preset below it.
 */
export const EditPresetForm: React.FC<Props> = (props) => {
  const prefix_ref = useRef<HTMLTextAreaElement>(null)
  const suffix_ref = useRef<HTMLTextAreaElement>(null)

  const [chatbot, set_chatbot] = useState(props.preset.chatbot)
  const [name, set_name] = useState(props.preset.name)
  const [temperature, set_temperature] = useState(props.preset.temperature)
  const [top_p, set_top_p] = useState(props.preset.top_p)
  const [thinking_budget, set_thinking_budget] = useState(
    props.preset.thinking_budget
  )
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
  const [active_field, set_active_field] = useState<
    'prompt_prefix' | 'prompt_suffix' | null
  >(null)

  useEffect(() => {
    if (!chatbot) return

    const model_info = model
      ? (CHATBOTS[chatbot].models as any)[model]
      : undefined
    if (model_info) {
      const disabled = model_info.disabled_options || []
      set_options((prev) => prev.filter((o) => !disabled.includes(o)))
    }
  }, [model, chatbot])

  const chatbot_config = chatbot ? CHATBOTS[chatbot] : undefined

  const supports_temperature = chatbot_config?.supports_custom_temperature
  const supports_top_p = chatbot_config?.supports_custom_top_p
  const supports_thinking_budget = chatbot_config?.supports_thinking_budget
  const supports_system_instructions =
    chatbot_config?.supports_system_instructions
  const supports_port = chatbot_config?.supports_user_provided_port
  const supports_user_provided_model =
    chatbot_config?.supports_user_provided_model
  const models = chatbot_config?.models || {}
  const supported_options = chatbot_config?.supported_options || {}

  useEffect(() => {
    if (chatbot) {
      props.on_update({
        name,
        chatbot,
        ...(prompt_prefix ? { prompt_prefix } : {}),
        ...(prompt_suffix ? { prompt_suffix } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        ...(top_p !== CHATBOTS[chatbot].default_top_p ? { top_p } : {}),
        ...(thinking_budget !== undefined ? { thinking_budget } : {}),
        ...(model ? { model } : {}),
        ...(system_instructions ? { system_instructions } : {}),
        ...(port !== undefined ? { port } : {}),
        ...(options.length ? { options } : {}),
        is_default: props.preset.is_default
      })
    } else {
      props.on_update({
        name,
        ...(prompt_prefix ? { prompt_prefix } : {}),
        ...(prompt_suffix ? { prompt_suffix } : {})
      })
    }
  }, [
    name,
    temperature,
    top_p,
    thinking_budget,
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
    set_thinking_budget(undefined)
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
      const message = event.data as BackendMessage
      if (message.command == 'NEWLY_PICKED_OPEN_ROUTER_MODEL') {
        set_model(message.model_id)
      } else if (
        message.command == 'AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX_RESULT'
      ) {
        const text_to_insert = message.text_to_insert
        let ref, value, setter
        if (active_field == 'prompt_prefix') {
          ref = prefix_ref
          value = prompt_prefix
          setter = set_prompt_prefix
        } else if (active_field == 'prompt_suffix') {
          ref = suffix_ref
          value = prompt_suffix
          setter = set_prompt_suffix
        } else {
          return
        }

        if (ref.current) {
          const start = ref.current.selectionStart
          const current_value = value || ''
          const new_value =
            current_value.slice(0, start) +
            text_to_insert +
            current_value.slice(start)
          setter(new_value.replace(/  +/g, ' '))

          setTimeout(() => {
            if (ref.current) {
              const new_caret_pos = start - 1 + text_to_insert.length
              ref.current.focus()
              ref.current.setSelectionRange(new_caret_pos, new_caret_pos)
            }
          }, 0)
        }
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [active_field, prompt_prefix, prompt_suffix])

  const handle_affix_change = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: (value: string) => void
  ) => {
    const new_value = e.target.value
    setter(new_value)

    if (e.target.value.charAt(e.target.selectionStart - 1) == '@') {
      setTimeout(() => {
        props.on_at_sign_in_affix()
      }, 150)
    }
  }

  return (
    <div className={styles.form}>
      {chatbot && (
        <Field label="Chatbot" html_for="chatbot">
          <select id="chatbot" value={chatbot} onChange={handle_chatbot_change}>
            {Object.keys(CHATBOTS).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </Field>
      )}

      {Object.keys(models).length > 0 && (
        <Field label="Model" html_for="model">
          <select
            id="model"
            value={model}
            onChange={(e) => set_model(e.target.value)}
          >
            {Object.entries(models).map(([value, model_data]) => (
              <option key={value} value={value}>
                {(model_data as any).label}
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
                <select id="open-router-model" value={model}>
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
            {Object.entries(supported_options).map(([key, label]) => {
              const model_info = model ? (models as any)[model] : undefined
              if (model_info?.disabled_options?.includes(key)) return null
              return (
                <label key={key} className={styles.options__item}>
                  <input
                    type="checkbox"
                    checked={options.includes(key)}
                    onChange={() => handle_option_toggle(key)}
                  />
                  {label as any}
                </label>
              )
            })}
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
            value={top_p || (chatbot && CHATBOTS[chatbot].default_top_p)!}
            onChange={set_top_p}
          />
        </Field>
      )}

      {supports_thinking_budget && (
        <Field label="Thinking Budget" html_for="thinking-budget">
          <input
            id="thinking-budget"
            type="text"
            value={thinking_budget ?? ''}
            onChange={(e) => {
              const num = parseInt(e.target.value, 10)
              set_thinking_budget(isNaN(num) ? undefined : num)
            }}
            placeholder="e.g. 8000"
            onKeyDown={(e) =>
              !/[0-9]/.test(e.key) && e.key != 'Backspace' && e.preventDefault()
            }
          />
        </Field>
      )}

      {supports_system_instructions && (
        <Field
          label="System Instructions"
          html_for="instructions"
          info="Optional tone and style instructions for the model"
        >
          <TextareaAutosize
            id="instructions"
            value={system_instructions}
            onChange={(e) => set_system_instructions(e.target.value)}
            minRows={2}
          />
        </Field>
      )}

      <>
        <Field
          label={chatbot ? 'Prompt Prefix' : 'Group Prefix'}
          html_for="prefix"
          info={
            chatbot
              ? 'Text prepended to all prompts used with this preset'
              : "Text prepended to all prompts used with this group's presets"
          }
        >
          <TextareaAutosize
            id="prefix"
            ref={prefix_ref}
            value={prompt_prefix}
            onChange={(e) => handle_affix_change(e, set_prompt_prefix)}
            onFocus={() => set_active_field('prompt_prefix')}
            minRows={2}
          />
        </Field>

        <Field
          label={chatbot ? 'Prompt Suffix' : 'Group Suffix'}
          html_for="suffix"
          info={
            chatbot
              ? 'Text appended to all prompts used with this preset'
              : "Text appended to all prompts used with this group's presets"
          }
        >
          <TextareaAutosize
            id="suffix"
            ref={suffix_ref}
            value={prompt_suffix}
            onChange={(e) => handle_affix_change(e, set_prompt_suffix)}
            onFocus={() => set_active_field('prompt_suffix')}
            minRows={2}
          />
        </Field>
      </>
      <Button on_click={props.on_save}>Save</Button>
    </div>
  )
}
