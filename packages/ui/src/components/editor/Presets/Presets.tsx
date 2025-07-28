import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../Icon'
import { useState } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { TextButton } from '../TextButton'

export const chatbot_to_icon: Record<keyof typeof CHATBOTS, Icon.Variant> = {
  'AI Studio': 'AI_STUDIO',
  Gemini: 'GEMINI',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  ChatGPT: 'CHATGPT',
  Claude: 'CLAUDE',
  DeepSeek: 'DEEPSEEK',
  Mistral: 'MISTRAL',
  Grok: 'GROK',
  Qwen: 'QWEN',
  Yuanbao: 'YUANBAO',
  Kimi: 'KIMI',
  Doubao: 'DOUBAO',
  Perplexity: 'PERPLEXITY',
  'Z.AI': 'Z_AI'
}

export namespace Presets {
  export type Preset = {
    name: string
    model?: string
    chatbot: keyof typeof CHATBOTS
    prompt_prefix?: string
    prompt_suffix?: string
    is_default?: boolean
  }

  export type Props = {
    web_mode: 'ask' | 'edit-context' | 'code-completions' | 'no-context'
    is_connected: boolean
    has_instructions: boolean
    has_active_editor: boolean
    has_active_selection: boolean
    is_in_code_completions_mode: boolean
    is_in_context_dependent_mode: boolean
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset: Preset) => void
    on_create_preset: () => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_set_default_presets: () => void
    translations: {
      my_chat_presets: string
      set_presets_opening_by_default: string
      select_default: string
      not_connected: string
      preset_requires_active_editor: string
      preset_cannot_be_used_with_selection: string
      initialize_chat_with_preset: string
      add_files_to_context_first: string
      type_or_add_prompt_to_use_preset: string
      copy_to_clipboard: string
      duplicate: string
      edit: string
      delete: string
      create_preset: string
    }
  }
}

const with_ids = (
  presets: Presets.Preset[]
): (Presets.Preset & { id: string })[] => {
  return presets.map((preset) => ({
    ...preset,
    id: preset.name
  }))
}

const ChatbotIcon: React.FC<{
  chatbot: keyof typeof CHATBOTS
  is_disabled: boolean
}> = (params) => {
  const icon_variant = chatbot_to_icon[params.chatbot]

  if (!icon_variant) return null

  return (
    <div
      className={cn(styles.presets__item__left__icon, {
        [styles['presets__item__left__icon--disabled']]: params.is_disabled
      })}
    >
      <Icon variant={icon_variant} />
    </div>
  )
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const [highlighted_preset_name, set_highlighted_preset_name] = useState<
    Record<Presets.Props['web_mode'], string>
  >({} as any)

  return (
    <div className={styles.container}>
      <div className={styles['my-presets']}>
        <div className={styles['my-presets__left']}>
          {props.translations.my_chat_presets}
        </div>

        <TextButton
          on_click={props.on_set_default_presets}
          title={props.translations.set_presets_opening_by_default}
        >
          {props.translations.select_default}
        </TextButton>
      </div>

      <div className={styles.presets}>
        <ReactSortable
          list={with_ids(props.presets)}
          setList={(new_state) => {
            if (props.on_presets_reorder) {
              const clean_presets = new_state.map(({ id, ...preset }) => preset)
              props.on_presets_reorder(clean_presets)
            }
          }}
          animation={150}
          handle={`.${styles.presets__item__right__drag_handle}`}
        >
          {props.presets.map((preset, i) => {
            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())
            const display_name = is_unnamed ? preset.chatbot : preset.name

            const get_subtitle = (): string => {
              const { chatbot, model } = preset

              const model_display_name = model
                ? (CHATBOTS[chatbot] as any).models[model] || model
                : null

              if (is_unnamed) {
                return model_display_name || ''
              }

              if (model_display_name) {
                return `${chatbot} · ${model_display_name}`
              }

              return chatbot
            }

            const is_item_disabled =
              (false && !props.is_connected) ||
              (props.is_in_code_completions_mode &&
                (!props.has_active_editor || props.has_active_selection)) ||
              (props.is_in_context_dependent_mode && !props.has_context) ||
              (!props.is_in_code_completions_mode &&
                !(
                  props.has_instructions ||
                  preset.prompt_prefix ||
                  preset.prompt_suffix
                ))

            const get_item_title = () => {
              if (!props.is_connected) {
                return props.translations.not_connected
              } else if (props.is_in_code_completions_mode) {
                return !props.has_active_editor
                  ? props.translations.preset_requires_active_editor
                  : props.has_active_selection
                  ? props.translations.preset_cannot_be_used_with_selection
                  : props.translations.initialize_chat_with_preset
              } else if (
                props.is_in_context_dependent_mode &&
                !props.has_context
              ) {
                return props.translations.add_files_to_context_first
              } else if (
                !props.is_in_code_completions_mode &&
                !(
                  props.has_instructions ||
                  preset.prompt_prefix ||
                  preset.prompt_suffix
                )
              ) {
                return props.translations.type_or_add_prompt_to_use_preset
              }
              return props.translations.initialize_chat_with_preset
            }

            return (
              <div
                key={i}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    highlighted_preset_name[props.web_mode] === preset.name,
                  [styles['presets__item--disabled']]: is_item_disabled
                })}
                onClick={() => {
                  if (!is_item_disabled) {
                    props.on_preset_click(preset)
                    set_highlighted_preset_name({
                      ...highlighted_preset_name,
                      [props.web_mode]: preset.name
                    })
                  }
                }}
                role="button"
                title={get_item_title()}
              >
                {preset.is_default && (
                  <div className={styles['presets__item__left__selected']} />
                )}

                <div className={styles.presets__item__left}>
                  <div className={styles.presets__item__left__icon}>
                    <Icon variant={chatbot_to_icon[preset.chatbot]} />
                  </div>
                  <div className={styles.presets__item__left__text}>
                    <span>{display_name}</span>
                    <span>{get_subtitle()}</span>
                  </div>
                </div>

                <div
                  className={styles.presets__item__right}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {(preset.prompt_prefix || preset.prompt_suffix) && (
                    <IconButton
                      codicon_icon="copy"
                      title={props.translations.copy_to_clipboard}
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_preset_copy(preset.name)
                      }}
                    />
                  )}
                  <IconButton
                    codicon_icon="files"
                    title={props.translations.duplicate}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_duplicate(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title={props.translations.edit}
                    on_click={(e) => {
                      e.stopPropagation()
                      set_highlighted_preset_name({
                        ...highlighted_preset_name,
                        [props.web_mode]: preset.name
                      })
                      props.on_preset_edit(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title={props.translations.delete}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_delete(preset.name)
                    }}
                  />
                  <div className={styles.presets__item__right__drag_handle}>
                    <span className="codicon codicon-gripper" />
                  </div>
                </div>
              </div>
            )
          })}
        </ReactSortable>
      </div>

      <div className={styles.presets__create}>
        <Button on_click={props.on_create_preset}>
          {props.translations.create_preset}
        </Button>
      </div>
    </div>
  )
}
