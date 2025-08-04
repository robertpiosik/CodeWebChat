import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Checkbox } from '../Checkbox'
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
  Together: 'TOGETHER',
  'Z.AI': 'Z_AI'
}

export namespace Presets {
  export type Preset = {
    name: string
    model?: string
    chatbot?: keyof typeof CHATBOTS
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
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset_name: string) => void
    on_group_click: (group_name: string) => void
    on_create_preset: () => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_toggle_default_preset: (name: string) => void
    translations: {
      my_chat_presets: string
      set_presets_opening_by_default: string
      not_connected: string
      preset_requires_active_editor: string
      preset_cannot_be_used_with_selection: string
      initialize_chat_with_preset: string
      type_or_add_prompt_to_use_preset: string
      copy_to_clipboard: string
      duplicate: string
      edit: string
      delete: string
      create: string
      set_as_default: string
      unset_as_default: string
      no_preset_enabled_or_selected_in_this_group: string
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

export const Presets: React.FC<Presets.Props> = (props) => {
  const [highlighted_preset_name, set_highlighted_preset_name] = useState<
    Record<Presets.Props['web_mode'], string>
  >({} as any)

  const get_is_preset_disabled = (preset: Presets.Preset) =>
    preset.chatbot &&
    (!props.is_connected ||
      (props.is_in_code_completions_mode &&
        (!props.has_active_editor || props.has_active_selection)) ||
      (!props.is_in_code_completions_mode &&
        !(
          props.has_instructions ||
          preset.prompt_prefix ||
          preset.prompt_suffix
        )))

  const get_is_ungrouped_disabled = () => {
    for (const p of props.presets) {
      if (!p.chatbot) {
        break
      }
      if (p.is_default && !get_is_preset_disabled(p)) {
        return false
      }
    }
    return true
  }

  const get_ungrouped_title = () => {
    if (!props.is_connected) {
      return props.translations.not_connected
    } else if (get_is_ungrouped_disabled()) {
      return props.translations.no_preset_enabled_or_selected_in_this_group
    } else if (props.is_in_code_completions_mode) {
      return !props.has_active_editor
        ? props.translations.preset_requires_active_editor
        : props.has_active_selection
        ? props.translations.preset_cannot_be_used_with_selection
        : props.translations.initialize_chat_with_preset
    } else if (!props.is_in_code_completions_mode && !props.has_instructions) {
      return props.translations.type_or_add_prompt_to_use_preset
    }
    return props.translations.initialize_chat_with_preset
  }

  return (
    <div className={styles.container}>
      <div className={styles['my-presets']}>
        <div className={styles['my-presets__left']}>
          {props.translations.my_chat_presets}
        </div>
        <IconButton codicon_icon="add" on_click={props.on_create_preset} />
      </div>

      <div className={styles.presets}>
        {props.presets[0]?.chatbot !== undefined && (
          <div
            className={cn(styles.presets__item, {
              [styles['presets__item--ungrouped']]: true,
              [styles['presets__item--disabled']]: get_is_ungrouped_disabled()
            })}
            onClick={() => {
              if (get_is_ungrouped_disabled()) return
              props.on_group_click('Ungrouped')
            }}
            role="button"
            title={get_ungrouped_title()}
          >
            <div className={styles.presets__item__left}>
              <div
                className={cn(
                  styles.presets__item__left__drag_handle,
                  styles['presets__item__left__drag_handle--disabled']
                )}
              >
                <span className="codicon codicon-gripper" />
              </div>
              <div className={styles.presets__item__left__text}>Ungrouped</div>
            </div>
          </div>
        )}

        <ReactSortable
          list={with_ids(props.presets)}
          setList={(new_state) => {
            if (props.on_presets_reorder) {
              const clean_presets = new_state.map(({ id, ...preset }) => preset)
              props.on_presets_reorder(clean_presets)
            }
          }}
          animation={150}
          handle={`.${styles.presets__item__left__drag_handle}`}
        >
          {props.presets.map((preset, i) => {
            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())
            const display_name =
              preset.chatbot && is_unnamed ? preset.chatbot : preset.name

            const get_subtitle = (): string => {
              const { chatbot, model } = preset

              if (!chatbot) {
                return model || ''
              }

              const model_display_name = model
                ? (CHATBOTS[chatbot].models as any)[model]?.label || model
                : null

              if (is_unnamed) {
                return model_display_name || ''
              }

              if (model_display_name) {
                return `${chatbot} · ${model_display_name}`
              }

              return chatbot
            }

            const get_is_group_disabled = () => {
              for (let j = i + 1; j < props.presets.length; j++) {
                const p = props.presets[j]
                if (!p.chatbot) {
                  break
                }
                if (p.is_default && !get_is_preset_disabled(p)) {
                  return false
                }
              }
              return true
            }

            const get_item_title = () => {
              if (!props.is_connected) {
                return props.translations.not_connected
              } else if (!preset.chatbot && get_is_group_disabled()) {
                return props.translations
                  .no_preset_enabled_or_selected_in_this_group
              } else if (props.is_in_code_completions_mode) {
                return !props.has_active_editor
                  ? props.translations.preset_requires_active_editor
                  : props.has_active_selection
                  ? props.translations.preset_cannot_be_used_with_selection
                  : props.translations.initialize_chat_with_preset
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
                    highlighted_preset_name[props.web_mode] == preset.name,
                  [styles['presets__item--disabled']]: preset.chatbot
                    ? get_is_preset_disabled(preset)
                    : get_is_group_disabled()
                })}
                onClick={() => {
                  if (preset.chatbot) {
                    if (get_is_preset_disabled(preset)) return
                    props.on_preset_click(preset.name)
                  } else {
                    if (get_is_group_disabled()) return
                    props.on_group_click(preset.name)
                  }

                  set_highlighted_preset_name({
                    ...highlighted_preset_name,
                    [props.web_mode]: preset.name
                  })
                }}
                role="button"
                title={get_item_title()}
              >
                <div className={styles.presets__item__left}>
                  <div className={styles.presets__item__left__drag_handle}>
                    <span className="codicon codicon-gripper" />
                  </div>
                  {preset.chatbot && (
                    <Checkbox
                      checked={!!preset.is_default}
                      on_change={() =>
                        props.on_toggle_default_preset(preset.name)
                      }
                      on_click={(e) => e.stopPropagation()}
                      title={
                        preset.is_default
                          ? props.translations.unset_as_default
                          : props.translations.set_as_default
                      }
                    />
                  )}
                  {preset.chatbot && (
                    <div className={styles.presets__item__left__icon}>
                      <Icon variant={chatbot_to_icon[preset.chatbot]} />
                    </div>
                  )}
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
                  {preset.chatbot &&
                    (preset.prompt_prefix || preset.prompt_suffix) && (
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
                </div>
              </div>
            )
          })}
        </ReactSortable>
      </div>
    </div>
  )
}
