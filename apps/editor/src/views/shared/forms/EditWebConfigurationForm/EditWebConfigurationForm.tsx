import { useState, useEffect, useMemo } from 'react'
import styles from './EditWebConfigurationForm.module.scss'
import { WebConfiguration } from '@shared/types/web-configuration'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Field as UiField } from '@ui/components/editor/common/Field'
import { Input as UiInput } from '@ui/components/editor/common/Input'
import { Textarea as UiTextarea } from '@ui/components/editor/common/Textarea'
import { BackendMessage } from '@/views/prompt/types/messages'
import { PresetOption as UiPresetOption } from '@ui/components/editor/prompt/PresetOption'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { Fieldset as UiFieldset } from '@ui/components/editor/prompt/Fieldset'
import { QuickPickButton as UiQuickPickButton } from '@ui/components/editor/common/QuickPickButton'
import { TextButton as UiTextButton } from '@ui/components/editor/common/TextButton'
import { use_translation, Translation } from '../../i18n/use-translation'

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
  const { t } = use_translation()

  const [chatbot, set_chatbot] = useState(props.web_configuration.chatbot)
  const [name, set_name] = useState(props.web_configuration.name)
  const [reasoning_effort, set_reasoning_effort] = useState(
    props.web_configuration.reasoning_effort
  )
  const [model, set_model] = useState(props.web_configuration.model)
  const [system_instructions, set_system_instructions] = useState(
    props.web_configuration.system_instructions
  )
  const [port, set_port] = useState(props.web_configuration.port)
  const [new_url, set_new_url] = useState(props.web_configuration.new_url)
  const [options, set_options] = useState<string[]>(
    props.web_configuration.options || []
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
        name
      })
    }
  }, [
    name,
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
    <UiScrollable top_shadow>
      <div className={styles.form}>
        <UiFieldset>
          {chatbot && (
            <UiField
              label={t('edit-web-configuration-form.chatbot')}
              html_for="chatbot"
            >
              <UiQuickPickButton
                label={chatbot}
                onClick={(e) => {
                  e.stopPropagation()
                  props.pick_chatbot(chatbot)
                }}
              />
            </UiField>
          )}

          {(Object.keys(models).length > 0 || chatbot == 'OpenRouter') && (
            <UiField
              label={t('edit-web-configuration-form.model')}
              html_for="model"
              action={
                model !== undefined && (
                  <UiTextButton on_click={() => set_model(undefined)}>
                    {t('edit-web-configuration-form.unset')}
                  </UiTextButton>
                )
              }
            >
              <UiQuickPickButton
                label={model_info?.label || model || '—'}
                onClick={(e) => {
                  e.stopPropagation()
                  if (chatbot) {
                    props.pick_model(chatbot, model)
                  }
                }}
              />
            </UiField>
          )}

          {supports_user_provided_model && (
            <UiField
              label={t('edit-web-configuration-form.model')}
              html_for="custom-model"
              action={
                model !== undefined && (
                  <UiTextButton on_click={() => set_model(undefined)}>
                    {t('edit-web-configuration-form.unset')}
                  </UiTextButton>
                )
              }
            >
              <UiInput
                id="custom-model"
                type="text"
                value={model || ''}
                on_change={set_model}
                placeholder={t('edit-web-configuration-form.model.placeholder')}
              />
            </UiField>
          )}

          {supports_reasoning_effort && (
            <UiField
              label={t('edit-web-configuration-form.reasoning-effort')}
              html_for="reasoning-effort"
              info={
                chatbot == 'OpenRouter'
                  ? t(
                      'edit-web-configuration-form.reasoning-effort.info.openrouter'
                    )
                  : t('edit-web-configuration-form.reasoning-effort.info')
              }
              action={
                reasoning_effort !== undefined && (
                  <UiTextButton
                    on_click={() => set_reasoning_effort(undefined)}
                  >
                    {t('edit-web-configuration-form.unset')}
                  </UiTextButton>
                )
              }
            >
              <UiQuickPickButton
                label={
                  reasoning_effort
                    ? reasoning_effort.charAt(0).toUpperCase() +
                      reasoning_effort.slice(1)
                    : '—'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  props.pick_reasoning_effort(
                    supported_reasoning_efforts,
                    reasoning_effort
                  )
                }}
              />
            </UiField>
          )}

          <UiField
            label={t('edit-web-configuration-form.name')}
            html_for="name"
          >
            <UiInput
              id="name"
              type="text"
              value={name && /^\(\d+\)$/.test(name) ? '' : name!}
              on_change={set_name}
              placeholder={
                chatbot ||
                t('edit-web-configuration-form.name.placeholder.group')
              }
            />
          </UiField>

          {supports_port && (
            <UiField
              label={t('edit-web-configuration-form.port')}
              html_for="port"
              info={
                chatbot == 'Open WebUI' && (
                  <Translation id="edit-web-configuration-form.port.info" />
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
                placeholder={t('edit-web-configuration-form.port.placeholder')}
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
              label={
                chatbot_config?.url_override_label ||
                t('edit-web-configuration-form.url-override')
              }
              html_for="new-url"
              info={t('edit-web-configuration-form.url-override.info')}
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
              label={t('edit-web-configuration-form.system-instructions')}
              html_for="instructions"
              info={t('edit-web-configuration-form.system-instructions.info')}
            >
              <UiTextarea
                id="instructions"
                value={system_instructions || ''}
                on_change={set_system_instructions}
                min_rows={2}
                placeholder={t(
                  'edit-web-configuration-form.system-instructions.placeholder'
                )}
              />
            </UiField>
          )}
        </UiFieldset>

        {chatbot &&
          Object.keys(chatbot_config?.supported_options || {}).length > 0 && (
            <UiFieldset label={t('edit-web-configuration-form.options')}>
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
                            ? t(
                                'edit-web-configuration-form.options.disabled-reason'
                              ).replace(
                                '{label}',
                                chatbot_config!.url_override_label ||
                                  t(
                                    'edit-web-configuration-form.options.custom-url'
                                  )
                              )
                            : undefined
                        }
                      />
                    )
                  }
                )}
              </div>
            </UiFieldset>
          )}
      </div>
    </UiScrollable>
  )
}
