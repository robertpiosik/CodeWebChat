import { useState, useEffect, useMemo } from 'react'
import cn from 'classnames'
import styles from './EditWebConfigurationForm.module.scss'
import dropdown_styles from '@ui/components/editor/common/Dropdown/Dropdown.module.scss'
import { WebConfiguration } from '@shared/types/web-configuration'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Field as UiField } from '@ui/components/editor/panel/Field'
import { Slider as UiSlider } from '@ui/components/editor/panel/Slider'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { BackendMessage } from '@/views/panel/types/messages'
import { PresetOption as UiPresetOption } from '@ui/components/editor/panel/PresetOption'
import { Scrollable as UiScrollable } from '@ui/components/editor/panel/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/panel/Fieldset'

type Props = {
  web_configuration: WebConfiguration
  on_update: (updated_web_configuration: WebConfiguration) => void
  pick_model: (chatbot_name: string, current_model_id?: string) => void
  pick_chatbot: (chatbot_id?: keyof typeof CHATBOTS) => void
  pick_reasoning_effort: (
    supported_efforts: string[],
    current_effort?: string
  ) => void
}

/**
 * Web Configuration can have a "group" variant (when chatbot is not set). It is used to:
 * - initialize all selected web configurations below it,
 */
export const EditWebConfigurationForm: React.FC<Props> = (props) => {
  const [chatbot, set_chatbot] = useState(props.web_configuration.chatbot)
  const [name, set_name] = useState(props.web_configuration.name)
  const [temperature, set_temperature] = useState(props.web_configuration.temperature)
  const [top_p, set_top_p] = useState(props.web_configuration.top_p)
  const [thinking_budget, set_thinking_budget] = useState(
    props.web_configuration.thinking_budget
  )
  const [reasoning_effort, set_reasoning_effort] = useState(
    props.web_configuration.reasoning_effort
  )
  const [model, set_model] = useState(props.web_configuration.model)
  const [system_instructions, set_system_instructions] = useState(
    props.web_configuration.system_instructions
  )
  const [port, set_port] = useState(props.web_configuration.port)
  const [new_url, set_new_url] = useState(props.web_configuration.new_url)
  const [options, set_options] = useState<string[]>(props.web_configuration.options || [])
  const [is_sampling_collapsed, set_is_sampling_collapsed] = useState(
    props.web_configuration.temperature === undefined && props.web_configuration.top_p === undefined
  )
  const [is_options_collapsed, set_is_options_collapsed] = useState(
    (props.web_configuration.options || []).length == 0
  )

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
  const supports_top_p = chatbot_config?.supports_custom_top_p
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
        ...(temperature !== undefined && temperature != 1
          ? { temperature }
          : {}),
        ...(top_p !== undefined && top_p != 0.95 ? { top_p } : {}),
        ...(thinking_budget !== undefined ? { thinking_budget } : {}),
        ...(reasoning_effort ? { reasoning_effort } : {}),
        ...(model ? { model } : {}),
        ...(system_instructions ? { system_instructions } : {}),
        ...(port !== undefined ? { port } : {}),
        ...(new_url ? { new_url } : {}),
        ...(options.length ? { options } : {}),
        is_pinned: props.web_configuration.is_pinned
      })
    } else {
      props.on_update({
        name,
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
      if (message.command == 'NEWLY_PICKED_MODEL') {
        set_model(message.model_id)
      } else if (message.command == 'NEWLY_PICKED_CHATBOT') {
        handle_chatbot_change(message.chatbot_id as keyof typeof CHATBOTS)
      } else if (message.command == 'NEWLY_PICKED_REASONING_EFFORT') {
        set_reasoning_effort(message.effort)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const supported_reasoning_efforts = useMemo(() => {
    return (
      chatbot_config?.supported_reasoning_efforts ||
      model_info?.supported_reasoning_efforts ||
      []
    )
  }, [chatbot_config, model_info])

  useEffect(() => {
    if (
      reasoning_effort &&
      !supported_reasoning_efforts.includes(reasoning_effort)
    )
      set_reasoning_effort(undefined)
  }, [reasoning_effort, supported_reasoning_efforts])

  return (
    <UiScrollable>
      <div className={styles.form}>
        <UiFieldset label="General">
          {chatbot && (
            <UiField label="Chatbot" html_for="chatbot">
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
            </UiField>
          )}

          {(Object.keys(models).length > 0 || chatbot == 'OpenRouter') && (
            <UiField label="Model" html_for="model">
              <button
                className={dropdown_styles.button}
                onClick={(e) => {
                  e.stopPropagation()
                  if (chatbot) {
                    props.pick_model(chatbot, model)
                  }
                }}
              >
                <span>{model_info?.label || model || 'Select model'}</span>
                <span
                  className={cn(
                    'codicon codicon-chevron-down',
                    dropdown_styles.chevron
                  )}
                />
              </button>
            </UiField>
          )}

          {supports_user_provided_model && (
            <UiField label="Model" html_for="custom-model">
              <UiInput
                id="custom-model"
                type="text"
                value={model || ''}
                on_change={set_model}
                placeholder="Enter model name"
              />
            </UiField>
          )}

          {supports_reasoning_effort && (
            <UiField
              label="Reasoning Effort"
              html_for="reasoning-effort"
              info={`Controls how much the model thinks.${
                chatbot == 'OpenRouter' ? ' Requires a reasoning model.' : ''
              }`}
            >
              <button
                className={dropdown_styles.button}
                onClick={(e) => {
                  e.stopPropagation()
                  props.pick_reasoning_effort(
                    supported_reasoning_efforts,
                    reasoning_effort
                  )
                }}
              >
                <span>
                  {reasoning_effort
                    ? reasoning_effort.charAt(0).toUpperCase() +
                      reasoning_effort.slice(1)
                    : '—'}
                </span>
                <span
                  className={cn(
                    'codicon codicon-chevron-down',
                    dropdown_styles.chevron
                  )}
                />
              </button>
            </UiField>
          )}

          {supports_thinking_budget && !supports_reasoning_effort && (
            <UiField
              label="Thinking Budget"
              html_for="thinking-budget"
              info="Search for allowed min-max values."
            >
              <UiInput
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
            </UiField>
          )}

          <UiField label="Name" html_for="name">
            <UiInput
              id="name"
              type="text"
              value={name && /^\(\d+\)$/.test(name) ? '' : name!}
              on_change={set_name}
              placeholder={chatbot || 'Group'}
            />
          </UiField>

          {supports_port && (
            <UiField
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
              <UiInput
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
            </UiField>
          )}

          {supports_url_override && (
            <UiField
              label={chatbot_config?.url_override_label || 'URL override'}
              html_for="new-url"
              info="Use a smart workspace for your coding tasks."
            >
              <UiInput
                id="new-url"
                type="text"
                value={new_url || ''}
                on_change={set_new_url}
              />
            </UiField>
          )}

          {supports_system_instructions && (
            <UiField
              label="System Instructions"
              html_for="instructions"
              info="Optional tone and style instructions for the model."
            >
              <UiTextarea
                id="instructions"
                value={system_instructions || ''}
                on_change={set_system_instructions}
                min_rows={2}
                placeholder="You're a helpful coding assistant."
              />
            </UiField>
          )}
        </UiFieldset>

        {chatbot &&
          Object.keys(chatbot_config?.supported_options || {}).length > 0 && (
            <UiFieldset
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
                      <UiPresetOption
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
            </UiFieldset>
          )}

        {(supports_temperature || supports_top_p) && (
          <UiFieldset
            label="Sampling parameters"
            is_collapsed={is_sampling_collapsed}
            on_toggle_collapsed={() =>
              set_is_sampling_collapsed(!is_sampling_collapsed)
            }
          >
            {supports_temperature && (
              <UiField
                label="Temperature"
                info="Influences response variety. Lower values are more predictable; higher values are more diverse."
                action={
                  temperature !== undefined && (
                    <button
                      className={styles.clear}
                      onClick={() => set_temperature(undefined)}
                    >
                      Clear
                    </button>
                  )
                }
              >
                <UiSlider
                  value={temperature}
                  onChange={set_temperature}
                  min={0}
                  max={2}
                />
              </UiField>
            )}

            {supports_top_p && (
              <UiField
                label="Top P"
                info="Limits token choices to cumulative probability P. Lower values make responses more predictable."
                action={
                  top_p !== undefined && (
                    <button
                      className={styles.clear}
                      onClick={() => set_top_p(undefined)}
                    >
                      Clear
                    </button>
                  )
                }
              >
                <UiSlider value={top_p} onChange={set_top_p} min={0} max={1} />
              </UiField>
            )}
          </UiFieldset>
        )}
      </div>
    </UiScrollable>
  )
}
