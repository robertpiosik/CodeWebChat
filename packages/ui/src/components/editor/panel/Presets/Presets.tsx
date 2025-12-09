import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Checkbox } from '../../common/Checkbox'
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
  LMArena: 'LMARENA',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  Perplexity: 'PERPLEXITY',
  Qwen: 'QWEN',
  Together: 'TOGETHER',
  Yuanbao: 'YUANBAO',
  'Z.AI': 'Z_AI'
}

export namespace Presets {
  export type Preset = {
    name?: string
    model?: string
    chatbot?: keyof typeof CHATBOTS
    prompt_prefix?: string
    prompt_suffix?: string
    is_selected?: boolean
    is_collapsed?: boolean
    is_pinned?: boolean
  }

  export type Props = {
    web_prompt_type: 'ask' | 'edit-context' | 'code-completions' | 'no-context'
    is_connected: boolean
    has_instructions: boolean
    is_in_code_completions_mode: boolean
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset_name: string, without_submission?: boolean) => void
    on_group_click: (group_name: string, without_submission?: boolean) => void
    on_create_preset_group_or_separator: (options?: {
      placement?: 'top' | 'bottom'
    }) => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_duplicate_preset_group_or_separator: (index: number) => void
    on_delete_preset_group_or_separator: (index: number) => void
    on_toggle_selected_preset: (name: string) => void
    on_toggle_preset_pinned: (name: string) => void
    on_toggle_group_collapsed: (name: string) => void
    selected_preset_name?: string
    is_collapsed: boolean
    on_toggle_collapsed: (is_collapsed: boolean) => void
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
    const visible_presets: (Presets.Preset & { original_index: number })[] = []
    let is_in_collapsed_group = false
    for (const [index, preset] of presets.entries()) {
      if (
        is_in_collapsed_group &&
        (preset.chatbot || preset.name === undefined) &&
        presets[index - 1]?.name
      ) {
        continue
      }
      if (!preset.chatbot) {
        is_in_collapsed_group = !!preset.is_collapsed
      } else {
        is_in_collapsed_group = false
      }
      visible_presets.push({ ...preset, original_index: index })
    }
    return visible_presets
  }

  const is_preset_in_group = (original_index: number | undefined): boolean => {
    if (original_index === undefined || original_index === 0) {
      return false
    }
    for (let i = original_index - 1; i >= 0; i--) {
      const p = props.presets[i]
      // group header
      if (!p.chatbot && p.name) {
        return true
      }
      // separator
      if (!p.chatbot && !p.name) {
        return false
      }
    }
    return false
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
                title="Initialize"
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
                  {(preset.prompt_prefix || preset.prompt_suffix) && (
                    <IconButton
                      codicon_icon="copy"
                      title="Copy to clipboard"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_preset_copy(preset.name!)
                      }}
                    />
                  )}
                  <IconButton
                    codicon_icon={preset.is_pinned ? 'pinned' : 'pin'}
                    title={preset.is_pinned ? 'Unpin' : 'Pin'}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_toggle_preset_pinned(preset.name!)
                    }}
                  />
                  <IconButton
                    codicon_icon="file-media"
                    title="Upload media before submitting message"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_click(preset.name!, true)
                    }}
                  />
                  <IconButton
                    codicon_icon="files"
                    title="Duplicate"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_duplicate_preset_group_or_separator(index)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title="Edit"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_edit(preset.name!)
                    }}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title="Delete"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_delete_preset_group_or_separator(index)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ListHeader
        title="Presets"
        is_collapsed={props.is_collapsed}
        on_toggle_collapsed={() =>
          props.on_toggle_collapsed(!props.is_collapsed)
        }
        actions={
          <IconButton
            codicon_icon="add"
            on_click={(e) => {
              e.stopPropagation()
              props.on_create_preset_group_or_separator({ placement: 'top' })
            }}
            title="Create New..."
          />
        }
      />
      {!props.is_collapsed && (
        <>
          <div className={styles.presets}>
            <ReactSortable
              list={sortable_list}
              setList={(new_state) => {
                // Handle normal preset/group reordering
                const new_visible_presets = new_state.map(
                  ({ id, ...preset }) => preset
                ) as Presets.Preset[]

                const reordered_presets: Presets.Preset[] = []

                for (const preset of new_visible_presets) {
                  reordered_presets.push(preset)

                  if (!preset.chatbot && preset.is_collapsed) {
                    // It's a collapsed group. Find its children in original list and add them.
                    const original_index = props.presets.findIndex(
                      (p) => p.name == preset.name
                    )

                    if (original_index != -1) {
                      for (
                        let i = original_index + 1;
                        i < props.presets.length;
                        i++
                      ) {
                        const child_candidate = props.presets[i]
                        if (
                          ((child_candidate.chatbot && child_candidate.name) ||
                            !child_candidate.name) &&
                          props.presets[i - 1].name
                        ) {
                          reordered_presets.push(child_candidate)
                        } else {
                          break
                        }
                      }
                    }
                  }
                }
                props.on_presets_reorder(reordered_presets)
              }}
              animation={150}
            >
              {sortable_list.map((preset) => {
                if (!preset.chatbot && !preset.name) {
                  return (
                    <div
                      key={preset.id}
                      className={cn(
                        styles.presets__item,
                        styles['presets__item--separator']
                      )}
                    >
                      <div className={styles.presets__item__left}>
                        <div
                          className={styles.presets__item__left__drag_handle}
                        >
                          <span className="codicon codicon-gripper" />
                        </div>
                      </div>
                      <div
                        className={styles.presets__item__right}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton
                          codicon_icon="files"
                          title="Duplicate"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_duplicate_preset_group_or_separator(
                              preset.original_index!
                            )
                          }}
                        />
                        <IconButton
                          codicon_icon="trash"
                          title="Delete"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_delete_preset_group_or_separator(
                              preset.original_index!
                            )
                          }}
                        />
                      </div>
                    </div>
                  )
                }

                const is_unnamed =
                  !preset.name || /^\(\d+\)$/.test(preset.name.trim())
                let display_name: string
                if (preset.chatbot) {
                  // Preset (has chatbot)
                  display_name = is_unnamed
                    ? preset.chatbot
                    : preset.name!.replace(/ \(\d+\)$/, '')
                } else {
                  // Group (no chatbot)
                  display_name = is_unnamed
                    ? 'Group'
                    : preset.name!.replace(/ \(\d+\)$/, '')
                }

                const get_subtitle = (): string => {
                  const { chatbot, model } = preset

                  if (!chatbot) {
                    const group_index = props.presets.findIndex(
                      (p) => p.name == preset.name
                    )

                    if (group_index !== -1) {
                      let preset_count = 0
                      let selected_count = 0
                      for (
                        let i = group_index + 1;
                        i < props.presets.length;
                        i++
                      ) {
                        const child_preset = props.presets[i]
                        if (!child_preset.chatbot || !child_preset.name) {
                          break
                        }
                        preset_count++
                        if (child_preset.is_selected) {
                          selected_count++
                        }
                      }
                      if (preset.is_collapsed) {
                        let text = `${preset_count} ${
                          preset_count == 1 ? 'preset' : 'presets'
                        }`
                        if (selected_count > 0) {
                          text += ` · ${selected_count} selected`
                        }
                        return text
                      }
                    }

                    return model || ''
                  }

                  const model_display_name = model
                    ? CHATBOTS[chatbot].models?.[model]?.label || model
                    : null

                  if (is_unnamed) {
                    return model_display_name || ''
                  }

                  if (model_display_name) {
                    return `${chatbot} · ${model_display_name}`
                  }

                  return chatbot
                }

                return (
                  <div
                    key={preset.id}
                    className={cn(styles.presets__item, {
                      [styles['presets__item--highlighted']]:
                        props.selected_preset_name == preset.name
                    })}
                    onClick={() => {
                      if (preset.chatbot) {
                        props.on_preset_click(preset.name!)
                      } else {
                        props.on_toggle_group_collapsed(preset.name!)
                      }
                    }}
                    role="button"
                    title="Initialize"
                  >
                    <div className={styles.presets__item__left}>
                      <div
                        className={styles.presets__item__left__drag_handle}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <span className="codicon codicon-gripper" />
                      </div>
                      {preset.chatbot && (
                        <Checkbox
                          checked={
                            !!preset.is_selected &&
                            is_preset_in_group(preset.original_index)
                          }
                          on_change={() =>
                            props.on_toggle_selected_preset(preset.name!)
                          }
                          on_click={(e) => e.stopPropagation()}
                          title={
                            !is_preset_in_group(preset.original_index)
                              ? 'Place in a group to select for multi-run'
                              : ''
                          }
                          disabled={!is_preset_in_group(preset.original_index)}
                        />
                      )}
                      {preset.chatbot && (
                        <div className={styles.presets__item__left__icon}>
                          <Icon variant={chatbot_to_icon[preset.chatbot]} />
                        </div>
                      )}
                      {!preset.chatbot && (
                        <div
                          className={
                            styles['presets__item__left__collapse-icon']
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          <span
                            className={cn('codicon', {
                              'codicon-chevron-right': preset.is_collapsed,
                              'codicon-chevron-down': !preset.is_collapsed
                            })}
                          />
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
                      {!preset.chatbot && (
                        <IconButton
                          codicon_icon="run-coverage"
                          title="Run Selected Presets"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_group_click(preset.name!)
                          }}
                        />
                      )}
                      {preset.chatbot &&
                        (preset.prompt_prefix || preset.prompt_suffix) && (
                          <IconButton
                            codicon_icon="copy"
                            title="Copy to clipboard"
                            on_click={(e) => {
                              e.stopPropagation()
                              props.on_preset_copy(preset.name!)
                            }}
                          />
                        )}
                      {preset.chatbot && (
                        <IconButton
                          codicon_icon={preset.is_pinned ? 'pinned' : 'pin'}
                          title={preset.is_pinned ? 'Unpin' : 'Pin'}
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_toggle_preset_pinned(preset.name!)
                          }}
                        />
                      )}
                      {preset.chatbot && (
                        <IconButton
                          codicon_icon="file-media"
                          title="Upload media before submitting message"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_preset_click(preset.name!, true)
                          }}
                        />
                      )}
                      <IconButton
                        codicon_icon="files"
                        title="Duplicate"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_duplicate_preset_group_or_separator(
                            preset.original_index!
                          )
                        }}
                      />
                      <IconButton
                        codicon_icon="edit"
                        title="Edit"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_preset_edit(preset.name!)
                        }}
                      />
                      <IconButton
                        codicon_icon="trash"
                        title="Delete"
                        on_click={(e) => {
                          e.stopPropagation()
                          props.on_delete_preset_group_or_separator(
                            preset.original_index!
                          )
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </ReactSortable>
          </div>
          <div className={styles.footer}>
            <Button
              on_click={() =>
                props.on_create_preset_group_or_separator({
                  placement: 'bottom'
                })
              }
            >
              Create New...
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
