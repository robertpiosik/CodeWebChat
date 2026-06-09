import styles from './Presets.module.scss'
import { IconButton } from '../../common/IconButton'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../../common/Icon'
import { Button } from '../../common/Button'
import { CHATBOTS } from '@shared/constants/chatbots'
import { ListHeader } from '../ListHeader'

export const chatbot_to_icon: Record<keyof typeof CHATBOTS, Icon.Variant> = {
  'AI Studio': 'AI_STUDIO',
  ChatGPT: 'CHATGPT',
  Claude: 'CLAUDE',
  Copilot: 'COPILOT',
  DeepSeek: 'DEEPSEEK',
  Doubao: 'DOUBAO',
  Gemini: 'GEMINI',
  'GitHub Copilot': 'GITHUB_COPILOT',
  Grok: 'GROK',
  HuggingChat: 'HUGGING_CHAT',
  Kimi: 'KIMI',
  Mistral: 'MISTRAL',
  'Meta AI': 'META',
  Arena: 'ARENA',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  Qwen: 'QWEN',
  Together: 'TOGETHER',
  Yuanbao: 'YUANBAO',
  Z: 'Z_AI'
}

export namespace Presets {
  export type Preset = {
    name?: string
    model?: string
    chatbot?: keyof typeof CHATBOTS
    is_pinned?: boolean
  }

  export type Props = {
    web_prompt_type:
      | 'ask-about-context'
      | 'edit-context'
      | 'code-at-cursor'
      | 'find-relevant-files'
      | 'no-context'
    is_connected: boolean
    has_instructions: boolean
    is_in_code_completions_mode: boolean
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset_name: string) => void
    on_create: (placement?: 'top' | 'bottom', reference_index?: number) => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_duplicate: (index: number) => void
    on_delete: (index: number) => void
    on_toggle_preset_pinned: (name: string) => void
    selected_preset_name?: string
    is_collapsed: boolean
    on_toggle_collapsed: (is_collapsed: boolean) => void
    translations: {
      title: string
      empty: string
      preset: string
      presets: string
      add_new: string
      add_new_tooltip: string
      copy_tooltip: string
      pin_tooltip: string
      unpin_tooltip: string
      duplicate_tooltip: string
      edit_tooltip: string
      delete_tooltip: string
      insert_tooltip: string
    }
  }
}

const with_ids = (
  presets: (Presets.Preset & { original_index: number })[]
): (Presets.Preset & { id: string; original_index: number })[] => {
  return presets.map((preset) => ({
    ...preset,
    id: preset.name ?? `separator-${preset.original_index}`
  }))
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const pinned_presets = props.presets.filter((p) => p.is_pinned && p.chatbot)

  const get_visible_presets = (
    presets: Presets.Preset[]
  ): (Presets.Preset & { original_index: number })[] => {
    return presets.map((preset, index) => ({ ...preset, original_index: index }))
  }

  const sortable_list = with_ids(get_visible_presets(props.presets))

  return (
    <div className={styles.container}>
      {pinned_presets.length > 0 && (
        <div className={styles.presets}>
          {props.presets.map((preset, index) => {
            if (!preset.is_pinned || !preset.chatbot) return null
            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())

            const display_name: string = is_unnamed
              ? preset.chatbot!
              : preset.name!.replace(/ \(\d+\)$/, '')

            const get_subtitle = (): string => {
              const { chatbot, model } = preset

              const model_display_name =
                model && chatbot
                  ? CHATBOTS[chatbot].models?.[model]?.label || model
                  : null

              if (is_unnamed) {
                return model_display_name || ''
              }

              if (model_display_name) {
                return `${chatbot} · ${model_display_name}`
              }

              return chatbot!
            }

            return (
              <div
                key={preset.name ?? `pinned-${index}`}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    props.selected_preset_name == preset.name
                })}
                onClick={() => {
                  props.on_preset_click(preset.name!)
                }}
                role="button"
              >
                <div className={styles.presets__item__left}>
                  <div className={styles.presets__item__left__icon}>
                    <Icon variant={chatbot_to_icon[preset.chatbot!]} />
                  </div>
                  <div className={styles.presets__item__left__text}>
                    <span>{display_name}</span>
                    <span>{get_subtitle()}</span>
                  </div>
                </div>

                <div
                  className={styles.presets__item__right}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    codicon_icon={preset.is_pinned ? 'pinned' : 'pin'}
                    title={
                      preset.is_pinned
                        ? props.translations.unpin_tooltip
                        : props.translations.pin_tooltip
                    }
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_toggle_preset_pinned(preset.name!)
                    }}
                  />
                  <IconButton
                    codicon_icon="files"
                    title={props.translations.duplicate_tooltip}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_duplicate(index)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title={props.translations.edit_tooltip}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_edit(preset.name!)
                    }}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title={props.translations.delete_tooltip}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_delete(index)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ListHeader
        title={props.translations.title}
        is_collapsed={props.is_collapsed}
        on_toggle_collapsed={() =>
          props.on_toggle_collapsed(!props.is_collapsed)
        }
        actions={
          <IconButton
            codicon_icon="add"
            on_click={(e) => {
              e.stopPropagation()
              props.on_create('top')
            }}
            title={props.translations.add_new_tooltip}
          />
        }
      />
      {!props.is_collapsed && (
        <>
          <div className={styles.presets}>
            {props.presets.length == 0 && (
              <div className={styles.empty}>{props.translations.empty}</div>
            )}
            <ReactSortable
              list={sortable_list}
              setList={(new_state) => {
                const has_order_changed =
                  new_state.length != sortable_list.length ||
                  new_state.some(
                    (item, index) => item.id != sortable_list[index].id
                  )

                if (!has_order_changed) return

                const new_visible_presets = new_state.map(
                  ({ id, ...preset }) => preset
                ) as Presets.Preset[]

                props.on_presets_reorder(new_visible_presets)
              }}
              animation={150}
            >
              {sortable_list.map((preset, index) => {
                const is_unnamed =
                  !preset.name || /^\(\d+\)$/.test(preset.name.trim())
                const display_name = is_unnamed
                  ? preset.chatbot!
                  : preset.name!.replace(/ \(\d+\)$/, '')

                const get_subtitle = (): string => {
                  const { chatbot, model } = preset

                  const model_display_name = model
                    ? CHATBOTS[chatbot!].models?.[model]?.label || model
                    : null

                  if (is_unnamed) {
                    return model_display_name || ''
                  }

                  if (model_display_name) {
                    return `${chatbot} · ${model_display_name}`
                  }

                  return chatbot!
                }

                return (
                  <div
                    key={preset.id}
                    className={cn(styles.presets__item, {
                      [styles['presets__item--highlighted']]:
                        props.selected_preset_name == preset.name
                    })}
                    onClick={() => {
                      props.on_preset_click(preset.name!)
                    }}
                    role="button"
                  >
                    <div className={styles.presets__item__left}>
                      <div
                        className={styles['presets__item__left__drag-handle']}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <span className="codicon codicon-gripper" />
                      </div>
                      <div className={styles.presets__item__left__icon}>
                        <Icon variant={chatbot_to_icon[preset.chatbot!]} />
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
                      <IconButton
                        codicon_icon={preset.is_pinned ? 'pinned' : 'pin'}
                        title={
                          preset.is_pinned
                            ? props.translations.unpin_tooltip
                            : props.translations.pin_tooltip
                        }
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_toggle_preset_pinned(preset.name!)
                        }}
                      />
                      <IconButton
                        codicon_icon="insert"
                        title={props.translations.insert_tooltip}
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_create(undefined, preset.original_index!)
                        }}
                      />
                      <IconButton
                        codicon_icon="files"
                        title={props.translations.duplicate_tooltip}
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_duplicate(preset.original_index!)
                        }}
                      />
                      <IconButton
                        codicon_icon="edit"
                        title={props.translations.edit_tooltip}
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_preset_edit(preset.name!)
                        }}
                      />
                      <IconButton
                        codicon_icon="trash"
                        title={props.translations.delete_tooltip}
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_delete(preset.original_index!)
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </ReactSortable>
          </div>
          <div className={styles.footer}>
            <Button on_click={() => props.on_create('bottom')}>
              {props.translations.add_new}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
