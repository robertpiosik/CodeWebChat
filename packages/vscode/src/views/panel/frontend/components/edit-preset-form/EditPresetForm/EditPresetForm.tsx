import { useState, useEffect, useRef, useMemo } from 'react'
import cn from 'classnames'
import styles from './EditPresetForm.module.scss'
import dropdown_styles from '@ui/components/editor/common/Dropdown/Dropdown.module.scss'
import { Preset } from '@shared/types/preset'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Field } from '@ui/components/editor/panel/Field'
import { Slider } from '@ui/components/editor/panel/Slider'
import { Input } from '@ui/components/editor/common/Input'
import { Textarea } from '@ui/components/editor/common/Textarea'
import { Dropdown } from '@ui/components/editor/common/Dropdown'
import { BackendMessage } from '@/views/panel/types/messages'
import { PresetOption } from '@ui/components/editor/panel/PresetOption'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { Fieldset } from '@ui/components/editor/panel/Fieldset'

type Props = {
  preset: Preset
  on_update: (updated_preset: Preset) => void
  pick_open_router_model: () => void
  pick_chatbot: (chatbot_id?: keyof typeof CHATBOTS) => void
  on_at_sign_in_affix: () => void
}

/**
 * Preset can have a "group" variant (when chatbot is not set). It is used to:
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
  const [reasoning_effort, set_reasoning_effort] = useState(
    props.preset.reasoning_effort
  )
  const [model, set_model] = useState(props.preset.model)
  const [system_instructions, set_system_instructions] = useState(
    props.preset.system_instructions
  )
  const [port, set_port] = useState(props.preset.port)
  const [new_url, set_new_url] = useState(props.preset.new_url)
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
  const [is_prompt_template_collapsed, set_is_prompt_template_collapsed] =
    useState(true)
  const [is_sampling_collapsed, set_is_sampling_collapsed] = useState(true)
  const [is_options_collapsed, set_is_options_collapsed] = useState(true)

  const chatbot_config = chatbot ? CHATBOTS[chatbot] : undefined
  const models = useMemo(() => chatbot_config?.models || {}, [chatbot_config])
  const model_info = useMemo(
    () =>
      model && chatbot_config?.models
        ? chatbot_config.models[model]
        : undefined,
    [model, chatbot_config]
  )

  useEffect(() => {
    if (!model && Object.keys(models).length > 0) {
      set_model(Object.keys(models)[0])
    }
  }, [model, models])

  useEffect(() => {
    if (model_info) {
      const disabled = model_info.disabled_options || []
      set_options((prev) => prev.filter((o) => !disabled.includes(o)))
    }
  }, [model_info])

  useEffect(() => {
    if (!chatbot) return
    const chatbot_config = CHATBOTS[chatbot]

    if (new_url && chatbot_config.url_override_disabled_options) {
      set_options((prev) =>
        prev.filter(
          (o) => !chatbot_config.url_override_disabled_options!.includes(o)
        )
      )
    }
  }, [chatbot, new_url])

  const supports_temperature = chatbot_config?.supports_custom_temperature
  const supports_top_p = chatbot_config?.default_top_p !== undefined
  const supports_thinking_budget = chatbot_config?.supports_thinking_budget
  const supports_reasoning_effort =
    chatbot_config?.supports_reasoning_effort ||
    !!model_info?.supported_reasoning_efforts
  const supports_system_instructions =
    chatbot_config?.supports_system_instructions
  const supports_port = chatbot_config?.supports_user_provided_port
  const supports_url_override = chatbot_config?.supports_url_override
  const supports_user_provided_model =
    chatbot_config?.supports_user_provided_model

  useEffect(() => {
    if (chatbot) {
      props.on_update({
        name,
        chatbot,
        ...(prompt_prefix ? { prompt_prefix } : {}),
        ...(prompt_suffix ? { prompt_suffix } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        ...(!supports_top_p || top_p !== chatbot_config.default_top_p
          ? { top_p }
          : {}),
        ...(thinking_budget !== undefined ? { thinking_budget } : {}),
        ...(reasoning_effort ? { reasoning_effort } : {}),
        ...(model ? { model } : {}),
        ...(system_instructions ? { system_instructions } : {}),
        ...(port !== undefined ? { port } : {}),
        ...(new_url ? { new_url } : {}),
        ...(options.length ? { options } : {}),
        is_selected: props.preset.is_selected,
        is_pinned: props.preset.is_pinned
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
    reasoning_effort,
    chatbot,
    model,
    system_instructions,
    port,
    new_url,
    prompt_prefix,
    prompt_suffix,
    options
  ])

  const handle_chatbot_change = (new_chatbot: keyof typeof CHATBOTS) => {
    set_chatbot(new_chatbot)
    set_model(Object.keys(CHATBOTS[new_chatbot].models ?? {})[0] || undefined)
    set_port(undefined)
    set_new_url(undefined)
    set_temperature(
      CHATBOTS[new_chatbot].supports_custom_temperature ? 0.5 : undefined
    )
    set_top_p(undefined)
    set_thinking_budget(undefined)
    set_reasoning_effort(undefined)
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
      } else if (message.command == 'NEWLY_PICKED_CHATBOT') {
        handle_chatbot_change(message.chatbot_id as keyof typeof CHATBOTS)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [active_field, prompt_prefix, prompt_suffix])

  const check_for_at_sign = (
    value: string,
    ref: React.RefObject<HTMLTextAreaElement>
  ) => {
    if (ref.current && value.charAt(ref.current.selectionStart - 1) == '@') {
      setTimeout(() => {
        props.on_at_sign_in_affix()
      }, 150)
    }
  }

  const reasoning_effort_options = useMemo(() => {
    if (model_info?.supported_reasoning_efforts) {
      return [
        { value: '—', label: '—' },
        ...model_info.supported_reasoning_efforts.map((effort: string) => {
          const capitalized = effort.charAt(0).toUpperCase() + effort.slice(1)
          return { value: effort, label: capitalized }
        })
      ]
    }
    return [
      { value: '—', label: '—' },
      { value: 'High', label: 'High' },
      { value: 'Medium', label: 'Medium' },
      { value: 'Low', label: 'Low' },
      { value: 'Minimal', label: 'Minimal' }
    ]
  }, [model_info])

  useEffect(() => {
    if (
      reasoning_effort &&
      !reasoning_effort_options.find((o) => o.value === reasoning_effort)
    )
      set_reasoning_effort(undefined)
  }, [reasoning_effort, reasoning_effort_options])

  return (
    <Scrollable>
      <div className={styles.form}>
        <Fieldset label="General">
          {chatbot && (
            <Field label="Chatbot" html_for="chatbot">
              <button
                className={dropdown_styles.button}
                onClick={(e) => {
                  e.stopPropagation()
                  props.pick_chatbot(chatbot)
                }}
              >
                <span>{chatbot}</span>
                <span
                  className={cn(
                    'codicon codicon-chevron-down',
                    dropdown_styles.chevron
                  )}
                />
              </button>
            </Field>
          )}

          {Object.keys(models).length > 0 && model && (
            <Field label="Model" html_for="model">
              <Dropdown
                options={Object.entries(models).map(([value, model_data]) => ({
                  value,
                  label: (model_data as any).label
                }))}
                value={model}
                onChange={set_model}
              />
            </Field>
          )}

          {chatbot == 'OpenRouter' && (
            <Field label="Model" html_for="open-router-model">
              <button
                className={dropdown_styles.button}
                onClick={(e) => {
                  e.stopPropagation()
                  props.pick_open_router_model()
                }}
              >
                <span>{model || 'Select model'}</span>
                <span
                  className={cn(
                    'codicon codicon-chevron-down',
                    dropdown_styles.chevron
                  )}
                />
              </button>
            </Field>
          )}

          {supports_user_provided_model && (
            <Field label="Model" html_for="custom-model">
              <Input
                id="custom-model"
                type="text"
                value={model || ''}
                on_change={set_model}
                placeholder="Enter model name"
              />
            </Field>
          )}

          <Field
            label="Name"
            html_for="name"
            info="Leave empty to use the selected chatbot name."
          >
            <Input
              id="name"
              type="text"
              value={name && /^\(\d+\)$/.test(name) ? '' : name!}
              on_change={set_name}
              placeholder={chatbot}
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
              <Input
                id="port"
                type="text"
                value={String(port ?? '')}
                on_change={(value) => {
                  const num = parseInt(value, 10)
                  set_port(isNaN(num) ? undefined : num)
                }}
                placeholder="e.g. 3000"
                on_key_down={(e) =>
                  !/[0-9]/.test(e.key) &&
                  e.key != 'Backspace' &&
                  e.preventDefault()
                }
              />
            </Field>
          )}

          {supports_url_override && (
            <Field
              label={chatbot_config?.url_override_label || 'URL override'}
              html_for="new-url"
              info="Keep all related chats in one place."
            >
              <Input
                id="new-url"
                type="text"
                value={new_url || ''}
                on_change={set_new_url}
              />
            </Field>
          )}

          {supports_reasoning_effort && (
            <Field
              label="Reasoning Effort"
              html_for="reasoning-effort"
              info={`Controls how much the model thinks.${
                chatbot == 'OpenRouter' ? ' Requires reasoning model.' : ''
              }`}
            >
              <Dropdown
                options={reasoning_effort_options}
                value={reasoning_effort || '—'}
                onChange={(value) => {
                  set_reasoning_effort(value == '—' ? undefined : value)
                }}
              />
            </Field>
          )}

          {supports_thinking_budget &&
            !supports_reasoning_effort && ( // Additional check for AI Studio
              <Field
                label="Thinking Budget"
                html_for="thinking-budget"
                info="Search for allowd min-max values."
              >
                <Input
                  id="thinking-budget"
                  type="text"
                  value={String(thinking_budget ?? '')}
                  on_change={(value) => {
                    const num = parseInt(value, 10)
                    set_thinking_budget(isNaN(num) ? undefined : num)
                  }}
                  placeholder="e.g. 8000"
                  on_key_down={(e) =>
                    !/[0-9]/.test(e.key) &&
                    e.key != 'Backspace' &&
                    e.preventDefault()
                  }
                />
              </Field>
            )}

          {supports_system_instructions && (
            <Field
              label="System Instructions"
              html_for="instructions"
              info="Optional tone and style instructions for the model."
            >
              <Textarea
                id="instructions"
                value={system_instructions || ''}
                on_change={set_system_instructions}
                min_rows={2}
                placeholder="You're a helpful coding assistant."
              />
            </Field>
          )}
        </Fieldset>

        {chatbot &&
          Object.keys(chatbot_config?.supported_options || {}).length > 0 && (
            <Fieldset
              label="Options"
              is_collapsed={is_options_collapsed}
              on_toggle_collapsed={() =>
                set_is_options_collapsed(!is_options_collapsed)
              }
            >
              <div className={styles.options}>
                {Object.entries(chatbot_config!.supported_options!).map(
                  ([key, label]) => {
                    const is_disabled_by_url_override =
                      !!new_url &&
                      chatbot_config!.url_override_disabled_options?.includes(
                        key
                      )

                    if (model_info?.disabled_options?.includes(key)) {
                      return null
                    }
                    return (
                      <PresetOption
                        key={key}
                        label={label as string}
                        checked={options.includes(key)}
                        on_change={() => handle_option_toggle(key)}
                        disabled={is_disabled_by_url_override}
                        disabled_reason={
                          is_disabled_by_url_override
                            ? `Not supported with ${
                                chatbot_config!.url_override_label ||
                                'Custom URL'
                              }`
                            : undefined
                        }
                      />
                    )
                  }
                )}
              </div>
            </Fieldset>
          )}

        {(supports_temperature || supports_top_p) && (
          <Fieldset
            label="Sampling parameters"
            is_collapsed={is_sampling_collapsed}
            on_toggle_collapsed={() =>
              set_is_sampling_collapsed(!is_sampling_collapsed)
            }
          >
            {supports_temperature && (
              <Field
                label="Temperature"
                info="Influences response variety. Lower values are more predictable; higher values are more diverse."
              >
                <Slider
                  value={temperature || 0.5}
                  onChange={set_temperature}
                  min={0}
                  max={2}
                />
              </Field>
            )}

            {supports_top_p && (
              <Field
                label="Top P"
                info="Limits token choices to cumulative probability P. Lower values make responses more predictable."
              >
                <Slider
                  value={top_p || (chatbot && CHATBOTS[chatbot].default_top_p)!}
                  onChange={set_top_p}
                  min={0}
                  max={1}
                />
              </Field>
            )}
          </Fieldset>
        )}

        <Fieldset
          label="Prompt template"
          is_collapsed={is_prompt_template_collapsed}
          on_toggle_collapsed={() =>
            set_is_prompt_template_collapsed(!is_prompt_template_collapsed)
          }
        >
          <Field
            label={chatbot ? 'Prompt Prefix' : 'Group Prefix'}
            html_for="prefix"
            info={
              chatbot
                ? 'Text prepended to all prompts used with this preset.'
                : "Text prepended to all prompts used with this group's presets."
            }
          >
            <Textarea
              id="prefix"
              ref={prefix_ref}
              value={prompt_prefix}
              on_change={(value) => {
                set_prompt_prefix(value)
                check_for_at_sign(value, prefix_ref)
              }}
              onFocus={() => set_active_field('prompt_prefix')}
              min_rows={2}
            />
          </Field>

          <Field
            label={chatbot ? 'Prompt Suffix' : 'Group Suffix'}
            html_for="suffix"
            info={
              chatbot
                ? 'Text appended to all prompts used with this preset.'
                : "Text appended to all prompts used with this group's presets."
            }
          >
            <Textarea
              id="suffix"
              ref={suffix_ref}
              value={prompt_suffix}
              on_change={(value) => {
                set_prompt_suffix(value)
                check_for_at_sign(value, suffix_ref)
              }}
              onFocus={() => set_active_field('prompt_suffix')}
              min_rows={2}
            />
          </Field>
        </Fieldset>
      </div>
    </Scrollable>
  )
}
