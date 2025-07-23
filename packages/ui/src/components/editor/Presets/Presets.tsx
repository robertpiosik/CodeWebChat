import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../Icon'
import { useState } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { TextButton } from '../TextButton'

export const chatbot_to_icon = {
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
  Perplexity: 'PERPLEXITY'
} as Record<string, Icon.Variant>

export namespace Presets {
  export type Preset = {
    name: string
    model?: string
    chatbot: keyof typeof CHATBOTS
    prompt_prefix?: string
    prompt_suffix?: string
  }

  export type Props = {
    is_connected: boolean
    has_instructions: boolean
    has_active_editor: boolean
    has_active_selection: boolean
    is_in_code_completions_mode: boolean
    is_in_context_dependent_mode: boolean
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset: Preset) => void
    selected_presets: string[]
    on_create_preset: () => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_set_default_presets: () => void
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
  const [highlighted_preset_name, set_highlighted_preset_name] =
    useState<string>()

  return (
    <div className={styles.container}>
      <div className={styles['my-presets']}>
        <div className={styles['my-presets__left']}>MY CHAT PRESETS</div>

        <TextButton
          on_click={props.on_set_default_presets}
          title="Set presets opening by default"
        >
          Select default
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
              !props.is_connected ||
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
                return 'Not connected. Ensure the browser extension is active'
              } else if (props.is_in_code_completions_mode) {
                return !props.has_active_editor
                  ? 'Preset in this mode requires an active editor'
                  : props.has_active_selection
                  ? 'Preset in this mode cannot be used with a text selection'
                  : `Initialize chat with this preset`
              } else if (
                props.is_in_context_dependent_mode &&
                !props.has_context
              ) {
                return 'Add some files to the context first'
              } else if (
                !props.is_in_code_completions_mode &&
                !(
                  props.has_instructions ||
                  preset.prompt_prefix ||
                  preset.prompt_suffix
                )
              ) {
                return 'Type something or add a prefix/suffix to this preset to use it'
              }
              return `Initialize chat with this preset`
            }

            return (
              <div
                key={i}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    highlighted_preset_name == preset.name,
                  [styles['presets__item--disabled']]: is_item_disabled
                })}
                onClick={() => {
                  if (!is_item_disabled) {
                    props.on_preset_click(preset)
                    set_highlighted_preset_name(preset.name)
                  }
                }}
                role="button"
                title={get_item_title()}
              >
                <div className={styles.presets__item__left}>
                  <ChatbotIcon chatbot={preset.chatbot} is_disabled={false} />

                  <div
                    className={cn(styles.presets__item__left__text, {
                      [styles['presets__item__left__text--selected']]:
                        props.selected_presets.includes(preset.name)
                    })}
                  >
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
                      title="Copy to clipboard"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_preset_copy(preset.name)
                      }}
                    />
                  )}
                  <IconButton
                    codicon_icon="files"
                    title="Duplicate"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_duplicate(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title="Edit"
                    on_click={(e) => {
                      e.stopPropagation()
                      set_highlighted_preset_name(preset.name)
                      props.on_preset_edit(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title="Delete"
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
        <Button on_click={props.on_create_preset}>Create Preset</Button>
      </div>
    </div>
  )
}
