import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Checkbox } from '../../common/Checkbox'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../../common/Icon'
import { CHATBOTS } from '@shared/constants/chatbots'

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
  Minimax: 'MINIMAX',
  Mistral: 'MISTRAL',
  // Meta: 'META',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  Perplexity: 'PERPLEXITY',
  Qwen: 'QWEN',
  Together: 'TOGETHER',
  Yuanbao: 'YUANBAO',
  'Z.AI': 'Z_AI'
}

const UNGROUPED_ID = '__ungrouped_drag_handle__'
const TRAILING_GROUP_ID = '__trailing_group_drag_handle__'

export namespace Presets {
  export type Preset = {
    name: string
    model?: string
    chatbot?: keyof typeof CHATBOTS
    prompt_prefix?: string
    prompt_suffix?: string
    is_selected?: boolean
    is_collapsed?: boolean
    is_pinned?: boolean
  }

  export type Props = {
    web_mode: 'ask' | 'edit-context' | 'code-completions' | 'no-context'
    is_connected: boolean
    has_instructions: boolean
    is_in_code_completions_mode: boolean
    has_context: boolean
    presets: Preset[]
    on_preset_click: (preset_name: string, without_submission?: boolean) => void
    on_group_click: (group_name: string, without_submission?: boolean) => void
    on_create_preset: () => void
    on_create_group: (options?: {
      add_on_top?: boolean
      instant?: boolean
      create_on_index?: number
      move_preset_with_name_after?: string
    }) => void
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_toggle_selected_preset: (name: string) => void
    on_toggle_preset_pinned: (name: string) => void
    on_toggle_group_collapsed: (name: string) => void
    selected_preset_name?: string
    is_collapsed: boolean
    on_toggle_collapsed: (is_collapsed: boolean) => void
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
  const { ungrouped_selected_count, ungrouped_preset_count } = (() => {
    let selected_count = 0
    let preset_count = 0
    if (props.presets[0]?.chatbot !== undefined) {
      for (const p of props.presets) {
        if (!p.chatbot) {
          break
        }
        preset_count++
        if (p.is_selected) {
          selected_count++
        }
      }
    }
    return {
      ungrouped_selected_count: selected_count,
      ungrouped_preset_count: preset_count
    }
  })()

  const pinned_presets = props.presets.filter((p) => p.is_pinned && p.chatbot)

  const get_visible_presets = (presets: Presets.Preset[]): Presets.Preset[] => {
    const visible_presets: Presets.Preset[] = []
    let is_in_collapsed_group = false
    for (const preset of presets) {
      if (is_in_collapsed_group && preset.chatbot) {
        continue
      }
      if (!preset.chatbot) {
        is_in_collapsed_group = !!preset.is_collapsed
      }
      visible_presets.push(preset)
    }
    return visible_presets
  }

  const sortable_list = (() => {
    let list = with_ids(get_visible_presets(props.presets))

    if (props.presets[0]?.chatbot !== undefined) {
      const ungrouped_item: Presets.Preset & { id: string } = {
        name: 'Ungrouped',
        id: UNGROUPED_ID
      }
      list = [ungrouped_item, ...list]
    }

    const last_preset = props.presets[props.presets.length - 1]
    // A group is a preset without a `chatbot` property
    const is_last_item_a_group = last_preset && !last_preset.chatbot
    if (!is_last_item_a_group) {
      const trailing_group_item: Presets.Preset & { id: string } = {
        name: 'Group',
        id: TRAILING_GROUP_ID
      }
      list = [...list, trailing_group_item]
    }

    return list
  })()

  return (
    <div className={styles.container}>
      {pinned_presets.length > 0 && (
        <div className={styles.presets}>
          {pinned_presets.map((preset) => {
            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())

            const display_name: string = is_unnamed
              ? preset.chatbot!
              : preset.name

            const get_subtitle = (): string => {
              const { chatbot, model } = preset

              const model_display_name =
                model && chatbot
                  ? (CHATBOTS[chatbot].models as any)[model]?.label || model
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
                key={preset.name}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    props.selected_preset_name == preset.name
                })}
                onClick={() => {
                  props.on_preset_click(preset.name)
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
                    codicon_icon={preset.is_pinned ? 'pinned' : 'pin'}
                    title={preset.is_pinned ? 'Unpin' : 'Pin'}
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_toggle_preset_pinned(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="debug-pause"
                    title="Run without submission"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_click(preset.name, true)
                    }}
                  />
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
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div
        className={styles.header}
        onClick={() => props.on_toggle_collapsed(!props.is_collapsed)}
        role="button"
      >
        <div className={styles.header__left}>
          <span
            className={cn('codicon', {
              'codicon-chevron-down': !props.is_collapsed,
              'codicon-chevron-right': props.is_collapsed
            })}
          />
          <span>Presets</span>
        </div>
        <div className={styles.header__right}>
          <IconButton
            codicon_icon="add"
            on_click={(e) => {
              e.stopPropagation()
              props.on_create_preset()
            }}
            title="Add New Preset"
          />
        </div>
      </div>
      {!props.is_collapsed && (
        <>
          <div className={styles.presets}>
            <ReactSortable
              list={sortable_list}
              setList={(new_state) => {
                const ungrouped_item = new_state.find(
                  (item) => item.id === UNGROUPED_ID
                )
                const ungrouped_was_moved = ungrouped_item
                  ? new_state[0].id !== UNGROUPED_ID
                  : false

                // Handle ungrouped item drag
                if (ungrouped_item && ungrouped_was_moved) {
                  const ungrouped_item_index = new_state.findIndex(
                    (item) => item.id === UNGROUPED_ID
                  )
                  const new_state_without_ungrouped = new_state.filter(
                    (item) => item.id !== UNGROUPED_ID
                  )

                  // Determine where to insert the new group
                  let target_full_index: number

                  if (
                    ungrouped_item_index < new_state_without_ungrouped.length
                  ) {
                    // Dropped between items - find the preset at or after this position
                    const preset_at_drop_location =
                      new_state_without_ungrouped[ungrouped_item_index]

                    if (preset_at_drop_location) {
                      target_full_index = props.presets.findIndex(
                        (p) => p.name === preset_at_drop_location.name
                      )

                      // Fallback if preset not found
                      if (target_full_index === -1) {
                        target_full_index = props.presets.length
                      }
                    } else {
                      target_full_index = props.presets.length
                    }
                  } else {
                    // Dropped at the end
                    target_full_index = props.presets.length
                  }

                  // Create group at calculated position
                  props.on_create_group({
                    create_on_index: target_full_index,
                    instant: true
                  })
                  return
                }

                // Handle preset dragged under trailing group
                const last_item = new_state[new_state.length - 1]
                const second_to_last_item =
                  new_state.length > 1 ? new_state[new_state.length - 2] : null

                if (
                  last_item?.id === TRAILING_GROUP_ID &&
                  second_to_last_item &&
                  second_to_last_item.chatbot
                ) {
                  props.on_create_group({
                    instant: true,
                    move_preset_with_name_after: second_to_last_item.name
                  })
                  return
                }

                // Handle trailing group item drag
                const trailing_group_item = new_state.find(
                  (item) => item.id === TRAILING_GROUP_ID
                )
                const trailing_group_was_moved = trailing_group_item
                  ? new_state[new_state.length - 1].id !== TRAILING_GROUP_ID
                  : false

                if (trailing_group_item && trailing_group_was_moved) {
                  const trailing_group_item_index = new_state.findIndex(
                    (item) => item.id === TRAILING_GROUP_ID
                  )
                  const new_state_without_trailing_group = new_state.filter(
                    (item) => item.id !== TRAILING_GROUP_ID
                  )

                  // Determine where to insert the new group
                  let target_full_index: number

                  if (
                    trailing_group_item_index <
                    new_state_without_trailing_group.length
                  ) {
                    // Dropped between items - find the preset at or after this position
                    const preset_at_drop_location =
                      new_state_without_trailing_group[
                        trailing_group_item_index
                      ]

                    if (preset_at_drop_location) {
                      if (preset_at_drop_location.id === UNGROUPED_ID) {
                        target_full_index = 0
                      } else {
                        target_full_index = props.presets.findIndex(
                          (p) => p.name === preset_at_drop_location.name
                        )
                      }

                      // Fallback if preset not found
                      if (target_full_index === -1) {
                        target_full_index = props.presets.length
                      }
                    } else {
                      target_full_index = props.presets.length
                    }
                  } else {
                    // Dropped at the end
                    target_full_index = props.presets.length
                  }

                  // Create group at calculated position
                  props.on_create_group({
                    create_on_index: target_full_index,
                    instant: true
                  })
                  return
                }

                // Handle normal preset/group reordering
                if (props.on_presets_reorder) {
                  const new_visible_presets = new_state
                    .map(({ id, ...preset }) => preset)
                    .filter(
                      (p) => p.name !== 'Ungrouped' && p.name !== 'Group'
                    ) as Presets.Preset[]

                  const reordered_presets: Presets.Preset[] = []

                  for (const preset of new_visible_presets) {
                    reordered_presets.push(preset)

                    if (!preset.chatbot && preset.is_collapsed) {
                      // It's a collapsed group. Find its children in original list and add them.
                      const original_index = props.presets.findIndex(
                        (p) => p.name === preset.name
                      )

                      if (original_index !== -1) {
                        for (
                          let i = original_index + 1;
                          i < props.presets.length;
                          i++
                        ) {
                          const child_candidate = props.presets[i]
                          if (child_candidate.chatbot) {
                            reordered_presets.push(child_candidate)
                          } else {
                            // next group found
                            break
                          }
                        }
                      }
                    }
                  }
                  props.on_presets_reorder(reordered_presets)
                }
              }}
              animation={150}
              handle={`.${styles.presets__item__left__drag_handle}`}
            >
              {sortable_list.map((preset) => {
                if (preset.id == UNGROUPED_ID) {
                  return (
                    <div
                      key={UNGROUPED_ID}
                      className={cn(styles.presets__item, {
                        [styles['presets__item--ungrouped']]: true,
                        [styles['presets__item--highlighted']]:
                          props.selected_preset_name == 'Ungrouped'
                      })}
                      onClick={() => {
                        props.on_create_group({
                          add_on_top: true,
                          instant: true
                        })
                      }}
                      role="button"
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
                        <div
                          className={
                            styles['presets__item__left__collapse-icon']
                          }
                        >
                          <span
                            className={cn('codicon', {
                              'codicon-chevron-down': true
                            })}
                          />
                        </div>
                        <div className={styles.presets__item__left__text}>
                          <span>Ungrouped</span>
                          <span>
                            {`${ungrouped_preset_count} ${
                              ungrouped_preset_count === 1
                                ? 'preset'
                                : 'presets'
                            }${
                              ungrouped_selected_count > 0
                                ? ` · ${ungrouped_selected_count} selected`
                                : ''
                            }`}
                          </span>
                        </div>
                      </div>
                      <div
                        className={styles.presets__item__right}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <IconButton
                          codicon_icon="run-all-coverage"
                          title="Run selected presets"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_group_click('Ungrouped')
                          }}
                        />
                        <IconButton
                          codicon_icon="edit"
                          title="Edit"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_create_group({ add_on_top: true })
                          }}
                        />
                      </div>
                    </div>
                  )
                }

                if (preset.id == TRAILING_GROUP_ID) {
                  return (
                    <div
                      key={TRAILING_GROUP_ID}
                      className={cn(
                        styles.presets__item,
                        styles['presets__item--ungrouped']
                      )}
                      onClick={() => props.on_create_group({ instant: true })}
                      role="button"
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
                        <div
                          className={
                            styles['presets__item__left__collapse-icon']
                          }
                        >
                          <span
                            className={cn('codicon', {
                              'codicon-chevron-down': true
                            })}
                          />
                        </div>
                        <div className={styles.presets__item__left__text}>
                          Group
                        </div>
                      </div>
                      <div
                        className={styles.presets__item__right}
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <IconButton
                          codicon_icon="run-all-coverage"
                          title="Run selected presets"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_group_click('Ungrouped')
                          }}
                        />
                        <IconButton
                          codicon_icon="edit"
                          title="Edit"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_create_group()
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
                  display_name = is_unnamed ? preset.chatbot : preset.name
                } else {
                  // Group (no chatbot)
                  display_name = is_unnamed
                    ? 'Group'
                    : preset.name.replace(/ \(\d+\)$/, '')
                }

                const get_subtitle = (): string => {
                  const { chatbot, model } = preset

                  if (!chatbot) {
                    const group_index = props.presets.findIndex(
                      (p) => p.name === preset.name
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
                        if (!child_preset.chatbot) {
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

                return (
                  <div
                    key={preset.name}
                    className={cn(styles.presets__item, {
                      [styles['presets__item--highlighted']]:
                        props.selected_preset_name == preset.name
                    })}
                    onClick={() => {
                      if (preset.chatbot) {
                        props.on_preset_click(preset.name)
                      } else {
                        props.on_toggle_group_collapsed(preset.name)
                      }
                    }}
                    role="button"
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
                          checked={!!preset.is_selected}
                          on_change={() =>
                            props.on_toggle_selected_preset(preset.name)
                          }
                          on_click={(e) => e.stopPropagation()}
                          title={
                            preset.is_selected
                              ? 'Unset as selected'
                              : 'Set as selected'
                          }
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
                          codicon_icon="run-all-coverage"
                          title="Run selected presets"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_group_click(preset.name)
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
                              props.on_preset_copy(preset.name)
                            }}
                          />
                        )}
                      {preset.chatbot && (
                        <IconButton
                          codicon_icon={preset.is_pinned ? 'pinned' : 'pin'}
                          title={preset.is_pinned ? 'Unpin' : 'Pin'}
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_toggle_preset_pinned(preset.name)
                          }}
                        />
                      )}
                      {preset.chatbot && (
                        <IconButton
                          codicon_icon="debug-continue-small"
                          title="Run without submission"
                          on_click={(e) => {
                            e.stopPropagation()
                            props.on_preset_click(preset.name, true)
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
                    </div>
                  </div>
                )
              })}
            </ReactSortable>
          </div>
        </>
      )}
    </div>
  )
}
