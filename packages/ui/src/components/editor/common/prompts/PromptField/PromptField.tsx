import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { ReactSortable } from 'react-sortablejs'
import styles from './PromptField.module.scss'
import cn from 'classnames'
import { Icon } from '../../Icon'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { use_ghost_text } from './hooks/use-ghost-text'
import { use_drag_drop } from './hooks/use-drag-drop'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { DropdownMenu } from '../../DropdownMenu'
import { use_is_mac } from '@shared/hooks'
import { Tooltip } from './components'
import { KeycapWrapper } from '../../../prompt/KeycapWrapper'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { TARGET, Target } from '@shared/types/mode'
import { display_token_count } from '@shared/utils/display-token-count'
import {
  get_caret_position_from_div,
  set_caret_position_for_div,
  map_raw_pos_to_display_pos,
  get_highlighted_text
} from '../shared/symbols'

export type EditFormat = 'whole' | 'search-replace' | 'diff' | 'truncated'

export type SelectionState = {
  text: string
  start_line: number
  start_col: number
  end_line: number
  end_col: number
}

export type PromptFieldProps = {
  value: string
  chat_history: string[]
  on_change: (value: string) => void
  on_submit: () => void
  on_submit_with_control: () => void
  on_copy: () => void
  is_connected: boolean
  prompt_type: WebPromptType | ApiPromptType
  current_selection?: SelectionState | null
  on_caret_position_change: (caret_position: number) => void
  is_web_target: boolean
  on_at_sign_click: () => void
  on_hash_sign_click: () => void
  on_slash_click: () => void
  send_with_shift_enter?: boolean
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  focus_key?: number
  focus_and_select_key?: number
  last_choice_tooltip?: { name: string; details?: string }
  show_edit_format_selector?: boolean
  edit_format?: EditFormat
  on_edit_format_change?: (format?: EditFormat) => void
  selected_files?: string[]
  currently_open_file_path?: string
  currently_open_file_text?: string
  on_go_to_file: (file_path: string) => void
  on_pasted_lines_click: (path: string, start?: string, end?: string) => void
  on_open_url: (url: string) => void
  on_paste_image: (base64_content: string) => void
  on_open_website: (url: string) => void
  on_open_image: (hash: string) => void
  on_paste_long_text: (text: string) => void
  on_open_pasted_text: (hash: string) => void
  on_paste_url: (url: string) => void
  on_preview_prompt?: () => void
  is_recording: boolean
  on_recording_started: () => void
  on_recording_finished: () => void
  tabs_count: number
  active_tab_index: number
  on_tab_change: (index: number) => void
  on_new_tab: () => void
  on_tab_delete: (index: number) => void
  on_tabs_reorder?: (new_order: number[]) => void
  warning?: string
  voice_input_push_to_talk?: boolean
  prompt_token_count: number
  is_copy_only?: boolean
  target: Target
  on_target_change: (target: Target) => void
  translations: {
    voice_input: string
    stop_recording: string
    reference_file: string
    insert_symbol: string
    use_template: string
    edit_format: string
    edit_format_whole: string
    edit_format_search_replace: string
    edit_format_diff: string
    edit_format_truncated: string
    placeholder_code_history: string
    placeholder_code: string
    placeholder_history: string
    placeholder_default: string
    send_with: string
    send_with_ellipsis: string
    copy_prompt: string
    preview_prompt: string
    more_actions: string
    send: string
    attach_selected_files: string
    target: string
  }
}

export const PromptField: React.FC<PromptFieldProps> = (props) => {
  const input_ref = useRef<HTMLDivElement>(null)
  const [caret_position, set_caret_position] = useState(0)
  const prev_tab_index_ref = useRef(props.active_tab_index)
  const [should_show_ghost_text, set_should_show_ghost_text] = useState(false)
  const [show_submit_tooltip, set_show_submit_tooltip] = useState(false)
  const [is_text_selecting, set_is_text_selecting] = useState(false)
  const [is_focused, set_is_focused] = useState(false)
  const [is_recording_hovered, set_is_recording_hovered] = useState(false)
  const [is_edit_format_hovered, set_is_edit_format_hovered] = useState(false)
  const [is_target_switch_hovered, set_is_target_switch_hovered] =
    useState(false)
  const [hovered_left_action, set_hovered_left_action] = useState<
    'at' | 'hash' | 'slash' | null
  >(null)

  const [tab_items, set_tab_items] = useState<{ id: string }[]>([])

  const container_inner_ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    set_tab_items((prev) => {
      if (prev.length === props.tabs_count) return prev
      if (prev.length < props.tabs_count) {
        return [
          ...prev,
          ...Array.from({ length: props.tabs_count - prev.length }).map(() => ({
            id: Math.random().toString(36).substring(7)
          }))
        ]
      }
      return prev.slice(0, props.tabs_count)
    })
  }, [props.tabs_count])

  const chevron_button_ref = useRef<HTMLButtonElement>(null)
  const disconnected_chevron_button_ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const has_submit_button =
      !props.is_copy_only &&
      (!props.is_web_target || (props.is_web_target && props.is_connected)) &&
      !props.is_recording &&
      !!props.value

    if (!has_submit_button) {
      set_show_submit_tooltip(false)
    }
  }, [
    props.value,
    props.is_recording,
    props.is_web_target,
    props.is_connected,
    props.prompt_type,
    props.is_copy_only
  ])

  useEffect(() => {
    const has_mic_button = props.is_recording || !props.value

    if (!has_mic_button) {
      set_is_recording_hovered(false)
    }
  }, [
    props.value,
    props.is_recording,
    props.is_web_target,
    props.is_connected,
    props.prompt_type
  ])

  useEffect(() => {
    if (props.warning && input_ref.current) {
      input_ref.current.blur()
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
      }
    }
  }, [props.warning])

  const { is_alt_pressed, handle_container_key_down } =
    use_keyboard_shortcuts(props)

  const {
    is_dropdown_open,
    toggle_dropdown,
    close_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  } = use_dropdown(props)

  const { ghost_text, handle_accept_ghost_text } = use_ghost_text({
    value: props.value,
    input_ref,
    is_focused: is_focused && should_show_ghost_text,
    currently_open_file_text: props.currently_open_file_text,
    selected_files: props.selected_files,
    caret_position
  })

  const {
    handle_input_change,
    handle_submit,
    handle_key_down,
    handle_copy,
    handle_cut,
    handle_paste,
    handle_input_click
  } = use_handlers(props, {
    input_ref,
    ghost_text,
    on_accept_ghost_text: handle_accept_ghost_text,
    set_caret_position
  })

  const { handle_drag_start, handle_drag_over, handle_drop, handle_drag_end } =
    use_drag_drop(props, input_ref)

  const mouse_down_pos_ref = useRef<{ x: number; y: number } | null>(null)

  const handle_mouse_down = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      set_should_show_ghost_text(false)
      mouse_down_pos_ref.current = { x: e.clientX, y: e.clientY }

      const handle_mouse_move = (move_e: MouseEvent) => {
        if (mouse_down_pos_ref.current) {
          const dx = Math.abs(move_e.clientX - mouse_down_pos_ref.current.x)
          const dy = Math.abs(move_e.clientY - mouse_down_pos_ref.current.y)
          if (dx >= 1 || dy >= 1) {
            set_is_text_selecting(true)
          }
        }
      }

      const handle_mouse_up = () => {
        set_is_text_selecting(false)
        mouse_down_pos_ref.current = null
        document.removeEventListener('mousemove', handle_mouse_move)
        document.removeEventListener('mouseup', handle_mouse_up)
      }

      document.addEventListener('mousemove', handle_mouse_move)
      document.addEventListener('mouseup', handle_mouse_up)
    },
    []
  )

  const is_mac = use_is_mac()

  const highlighted_html = useMemo(() => {
    return get_highlighted_text({
      text: props.value,
      current_selection: props.current_selection,
      context_file_paths: props.selected_files ?? [],
      is_web_target: props.is_web_target,
      tabs_config: {
        count: props.tabs_count,
        active_index: props.active_tab_index
      }
    })
  }, [
    props.value,
    props.prompt_type,
    props.current_selection,
    props.selected_files,
    props.is_web_target,
    props.tabs_count,
    props.active_tab_index
  ])

  useEffect(() => {
    if (input_ref.current && input_ref.current.innerHTML !== highlighted_html) {
      const is_focused = document.activeElement === input_ref.current
      const tab_changed = prev_tab_index_ref.current !== props.active_tab_index

      let selection_start = 0
      if (!tab_changed) {
        selection_start = get_caret_position_from_div(input_ref.current)
      }

      input_ref.current.innerHTML = highlighted_html

      if (tab_changed) {
        prev_tab_index_ref.current = props.active_tab_index
        const display_pos = map_raw_pos_to_display_pos({
          raw_pos: props.value.length,
          raw_text: props.value,
          context_file_paths: props.selected_files ?? []
        })
        if (!props.warning) {
          input_ref.current.focus()
        }
        set_caret_position_for_div(input_ref.current, display_pos)
      } else if (is_focused) {
        set_caret_position_for_div(input_ref.current, selection_start)
      }
    }
  }, [
    highlighted_html,
    props.active_tab_index,
    props.value,
    props.selected_files
  ])

  const placeholder = useMemo(() => {
    return props.chat_history.length > 0
      ? props.translations.placeholder_history
      : props.translations.placeholder_default
  }, [props.prompt_type, props.chat_history])

  useEffect(() => {
    if (props.is_recording) {
      const handle_click = () => {
        props.on_recording_finished()
      }

      document.addEventListener('click', handle_click, true)
      return () => {
        document.removeEventListener('click', handle_click, true)
      }
    }
  }, [props.is_recording])

  const render_footer = () => (
    <div
      className={styles.footer}
      onClick={() => {
        if (input_ref.current && !props.warning) {
          input_ref.current.focus()
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.selectNodeContents(input_ref.current)
            if (!props.value) {
              range.collapse(true)
            }
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }}
    >
      {hovered_left_action == 'at' && (
        <Tooltip
          message={props.translations.reference_file}
          align="left"
          offset={9}
        />
      )}
      {hovered_left_action == 'hash' && (
        <Tooltip
          message={props.translations.insert_symbol}
          align="left"
          offset={28}
        />
      )}
      {hovered_left_action == 'slash' && (
        <Tooltip
          message={props.translations.use_template}
          align="left"
          offset={48}
        />
      )}
      {props.last_choice_tooltip && show_submit_tooltip && (
        <Tooltip
          message={`${props.translations.send_with} ${props.last_choice_tooltip.name}`}
          details={props.last_choice_tooltip.details}
          offset={28}
          align="right"
        />
      )}
      {is_recording_hovered && (
        <Tooltip
          message={
            props.is_recording
              ? props.translations.stop_recording
              : props.translations.voice_input
          }
          details={is_mac ? '⇧⌘Space' : 'Ctrl+Shift+Space'}
          offset={
            props.is_copy_only || (props.is_web_target && !props.is_connected)
              ? 12
              : 28
          }
          align="right"
        />
      )}
      <div
        className={styles.footer__left}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <button
          onClick={() => {
            props.on_at_sign_click()
          }}
          className={cn(styles['footer__left__button'])}
          onMouseEnter={() => set_hovered_left_action('at')}
          onMouseLeave={() => set_hovered_left_action(null)}
        >
          <Icon variant="AT_SIGN" />
        </button>
        <button
          onClick={props.on_hash_sign_click}
          className={cn(styles['footer__left__button'])}
          onMouseEnter={() => set_hovered_left_action('hash')}
          onMouseLeave={() => set_hovered_left_action(null)}
        >
          <Icon variant="HASH_SIGN" />
        </button>
        <button
          onClick={props.on_slash_click}
          className={cn(styles['footer__left__button'])}
          onMouseEnter={() => set_hovered_left_action('slash')}
          onMouseLeave={() => set_hovered_left_action(null)}
        >
          <Icon variant="SLASH" />
        </button>
        <span className={styles.icon}></span>
      </div>
      <div
        className={styles.footer__right}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {props.show_edit_format_selector && props.edit_format && (
          <div className={styles['footer__right__edit-format']}>
            {is_edit_format_hovered && (
              <Tooltip
                message={props.translations.edit_format}
                details={is_mac ? '⌥' : 'Alt'}
                align="center"
              />
            )}
            <button
              className={cn(styles['footer__right__edit-format__button'], {
                [styles['footer__right__edit-format__button--alt-pressed']]:
                  is_alt_pressed
              })}
              onClick={() => props.on_edit_format_change?.()}
              onMouseEnter={() => set_is_edit_format_hovered(true)}
              onMouseLeave={() => set_is_edit_format_hovered(false)}
            >
              {is_alt_pressed ? (
                <span className={styles['footer__right__edit-format__keycaps']}>
                  <KeycapWrapper
                    char={props.edit_format != 'whole' ? 'W' : undefined}
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.edit_format == 'whole'
                        }
                      )}
                      style={{
                        visibility:
                          props.edit_format != 'whole' ? 'hidden' : undefined
                      }}
                    >
                      W
                    </span>
                  </KeycapWrapper>
                  <KeycapWrapper
                    char={
                      props.edit_format != 'search-replace' ? 'S' : undefined
                    }
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.edit_format == 'search-replace'
                        }
                      )}
                      style={{
                        visibility:
                          props.edit_format != 'search-replace'
                            ? 'hidden'
                            : undefined
                      }}
                    >
                      S
                    </span>
                  </KeycapWrapper>
                  <KeycapWrapper
                    char={props.edit_format != 'diff' ? 'D' : undefined}
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.edit_format == 'diff'
                        }
                      )}
                      style={{
                        visibility:
                          props.edit_format != 'diff' ? 'hidden' : undefined
                      }}
                    >
                      D
                    </span>
                  </KeycapWrapper>
                  <KeycapWrapper
                    char={props.edit_format != 'truncated' ? 'T' : undefined}
                  >
                    <span
                      className={cn(
                        styles['footer__right__edit-format__keycap'],
                        {
                          [styles[
                            'footer__right__edit-format__keycap--active'
                          ]]: props.edit_format == 'truncated'
                        }
                      )}
                      style={{
                        visibility:
                          props.edit_format != 'truncated'
                            ? 'hidden'
                            : undefined
                      }}
                    >
                      T
                    </span>
                  </KeycapWrapper>
                </span>
              ) : (
                {
                  whole: props.translations.edit_format_whole,
                  'search-replace':
                    props.translations.edit_format_search_replace,
                  diff: props.translations.edit_format_diff,
                  truncated: props.translations.edit_format_truncated
                }[props.edit_format as EditFormat]
              )}
            </button>
          </div>
        )}

        <div className={styles['footer__right__submit']} ref={dropdown_ref}>
          {props.target && props.on_target_change && (
            <div className={styles['footer__right__target-switch']}>
              {is_target_switch_hovered && (
                <Tooltip
                  message={props.translations.target}
                  details={is_mac ? '⌥' : 'Alt'}
                  align="center"
                />
              )}
              <KeycapWrapper char={is_alt_pressed ? 'Esc' : undefined}>
                <button
                  className={cn(
                    styles['footer__right__submit__button'],
                    styles['footer__right__target-switch__button']
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.on_target_change!(
                      props.target == TARGET.WEB ? TARGET.API : TARGET.WEB
                    )
                  }}
                  onMouseEnter={() => set_is_target_switch_hovered(true)}
                  onMouseLeave={() => set_is_target_switch_hovered(false)}
                >
                  <span
                    className={styles['footer__right__target-switch__label']}
                  >
                    {(props.target == TARGET.WEB ? 'WEB' : 'API')
                      .split('')
                      .map((char, index) => (
                        <span
                          key={index}
                          className={
                            styles['footer__right__target-switch__label-char']
                          }
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          {char}
                        </span>
                      ))}
                  </span>
                </button>
              </KeycapWrapper>
            </div>
          )}
          {!props.is_copy_only &&
            (!props.is_web_target ||
              (props.is_web_target && props.is_connected)) && (
              <>
                {props.is_recording ? (
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--submit'],
                      styles['footer__right__submit__button--recording'],
                      'codicon',
                      is_recording_hovered
                        ? 'codicon-debug-stop'
                        : 'codicon-mic-filled'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.on_recording_finished()
                    }}
                    onMouseEnter={() => set_is_recording_hovered(true)}
                    onMouseLeave={() => set_is_recording_hovered(false)}
                  />
                ) : !props.value ? (
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--submit'],
                      'codicon',
                      'codicon-mic'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.on_recording_started()
                    }}
                    onMouseEnter={() => set_is_recording_hovered(true)}
                    onMouseLeave={() => set_is_recording_hovered(false)}
                  />
                ) : (
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--submit'],
                      'codicon',
                      'codicon-send'
                    )}
                    onClick={handle_submit}
                    onMouseEnter={() => set_show_submit_tooltip(true)}
                    onMouseLeave={() => set_show_submit_tooltip(false)}
                  />
                )}
                <button
                  ref={chevron_button_ref}
                  className={styles['footer__right__submit__button']}
                  onClick={() => {
                    toggle_dropdown()
                  }}
                  title={props.translations.more_actions}
                >
                  <span
                    className={cn(
                      {
                        [styles['footer__right__submit__button--toggled']]:
                          is_dropdown_open
                      },
                      'codicon',
                      'codicon-chevron-down'
                    )}
                  />
                </button>
                <DropdownMenu
                  anchor_ref={chevron_button_ref}
                  is_open={is_dropdown_open}
                  items={[
                    ...(!props.value && props.is_web_target
                      ? [
                          {
                            label: props.translations.send,
                            shortcut: is_mac ? '↩' : 'Enter',
                            on_click: () => {
                              handle_submit({
                                stopPropagation: () => {}
                              } as any)
                              close_dropdown()
                            }
                          }
                        ]
                      : []),
                    {
                      label: props.translations.send_with_ellipsis,
                      shortcut: is_mac ? '⌘↩' : 'Ctrl+Enter',
                      on_click: handle_select_click
                    },
                    {
                      label: props.translations.copy_prompt,
                      shortcut: is_mac ? '⌘C' : 'Ctrl+C',
                      on_click: handle_copy_click
                    },
                    ...(props.value
                      ? [
                          {
                            label: props.translations.voice_input,
                            shortcut: is_mac ? '⇧⌘Space' : 'Ctrl+Shift+Space',
                            on_click: () => {
                              props.on_recording_started()
                              close_dropdown()
                            }
                          }
                        ]
                      : []),
                    {
                      label: props.translations.preview_prompt,
                      on_click: () => {
                        props.on_preview_prompt?.()
                        close_dropdown()
                      }
                    }
                  ]}
                />
              </>
            )}
          {(props.is_copy_only ||
            (props.is_web_target && !props.is_connected)) && (
            <>
              {props.is_recording ? (
                <button
                  className={cn(
                    styles['footer__right__submit__button'],
                    styles['footer__right__submit__button--submit'],
                    styles['footer__right__submit__button--recording'],
                    'codicon',
                    is_recording_hovered
                      ? 'codicon-debug-stop'
                      : 'codicon-mic-filled'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.on_recording_finished()
                  }}
                  onMouseEnter={() => set_is_recording_hovered(true)}
                  onMouseLeave={() => set_is_recording_hovered(false)}
                />
              ) : !props.value ? (
                <button
                  className={cn(
                    styles['footer__right__submit__button'],
                    styles['footer__right__submit__button--submit'],
                    'codicon',
                    'codicon-mic'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.on_recording_started()
                  }}
                  onMouseEnter={() => set_is_recording_hovered(true)}
                  onMouseLeave={() => set_is_recording_hovered(false)}
                />
              ) : (
                <>
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--copy'],
                      'codicon',
                      'codicon-copy'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      props.on_copy()
                    }}
                    title={props.translations.copy_prompt}
                  />
                  <button
                    ref={disconnected_chevron_button_ref}
                    className={styles['footer__right__submit__button']}
                    onClick={() => {
                      toggle_dropdown()
                    }}
                    title={props.translations.more_actions}
                  >
                    <span
                      className={cn(
                        {
                          [styles['footer__right__submit__button--toggled']]:
                            is_dropdown_open
                        },
                        'codicon',
                        'codicon-chevron-down'
                      )}
                    />
                  </button>
                  <DropdownMenu
                    anchor_ref={disconnected_chevron_button_ref}
                    is_open={is_dropdown_open}
                    items={[
                      {
                        label: props.translations.voice_input,
                        shortcut: is_mac ? '⇧⌘Space' : 'Ctrl+Shift+Space',
                        on_click: () => {
                          props.on_recording_started()
                          close_dropdown()
                        }
                      },
                      {
                        label: props.translations.preview_prompt,
                        on_click: () => {
                          props.on_preview_prompt?.()
                          close_dropdown()
                        }
                      }
                    ]}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      {props.warning ? (
        <div className={styles.warning}>
          <div className={styles.warning__inner}>{props.warning}</div>
        </div>
      ) : null}

      <div
        ref={container_inner_ref}
        className={cn(styles.container__inner, {
          [styles['container__inner--disabled']]: !!props.warning,
          [styles['container__inner--selecting']]: is_text_selecting
        })}
        onKeyDown={handle_container_key_down}
        onClick={() => !props.warning && input_ref.current?.focus()}
      >
        <div className={styles['input-wrapper']}>
          <div className={styles['top-right']}>
            {!!props.value && props.prompt_token_count > 1000 && (
              <div className={styles['top-right__prompt-token-count']}>
                {display_token_count(props.prompt_token_count)}
              </div>
            )}
            {(!!props.value || props.tabs_count > 1) && (
              <div
                className={cn(
                  styles['top-right__clear-button'],
                  'codicon',
                  'codicon-close'
                )}
                data-role="clear-button"
                onClick={handle_input_click}
              />
            )}
          </div>
          {props.tabs_count > 1 ? (
            <ReactSortable
              list={tab_items}
              setList={(new_list) => {
                const has_changed = new_list.some(
                  (item, i) => item.id !== tab_items[i]?.id
                )
                if (has_changed) {
                  const new_order = new_list.map((item) =>
                    tab_items.findIndex((t) => t.id === item.id)
                  )
                  set_tab_items(new_list)
                  props.on_tabs_reorder?.(new_order)
                }
              }}
              className={styles.tabs}
              animation={150}
              filter={`.${styles['tabs__tab--new']}`}
            >
              {tab_items.map((item, i) => (
                <div
                  key={item.id}
                  className={cn(styles.tabs__tab, {
                    [styles['tabs__tab--active']]: i === props.active_tab_index
                  })}
                  onClick={(e) => {
                    e.stopPropagation()
                    props.on_tab_change(i)
                  }}
                >
                  <div className={styles['tabs__tab-icon']} />
                </div>
              ))}
              <div
                className={cn(styles.tabs__tab, styles['tabs__tab--new'])}
                onClick={(e) => {
                  e.stopPropagation()
                  props.on_new_tab()
                }}
              />
            </ReactSortable>
          ) : props.tabs_count === 1 ? (
            <div className={styles.tabs}>
              <div
                className={cn(styles.tabs__tab, styles['tabs__tab--new'])}
                onClick={(e) => {
                  e.stopPropagation()
                  props.on_new_tab()
                }}
              />
            </div>
          ) : null}
          <div
            ref={input_ref}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onInput={(e) => {
              set_should_show_ghost_text(true)
              handle_input_change(e)
            }}
            onKeyDown={(e) => {
              if (
                e.key == 'ArrowRight' ||
                e.key == 'ArrowLeft' ||
                e.key == 'ArrowUp' ||
                e.key == 'ArrowDown'
              ) {
                set_should_show_ghost_text(false)
                const ghost_text_node = input_ref.current?.querySelector(
                  'span[data-type="ghost-text"]'
                )
                if (ghost_text_node && !e.ctrlKey && !e.altKey && !e.metaKey) {
                  ghost_text_node.remove()
                  e.preventDefault()
                  const selection = window.getSelection()
                  if (selection) {
                    const type = e.shiftKey ? 'extend' : 'move'
                    selection.modify(type, 'forward', 'character')
                  }
                }
              } else {
                set_should_show_ghost_text(true)
              }
              handle_key_down(e)
            }}
            onCopy={handle_copy}
            onCut={handle_cut}
            onPaste={handle_paste}
            onClick={handle_input_click}
            onMouseDown={handle_mouse_down}
            onDragStart={handle_drag_start}
            onDrop={handle_drop}
            onDragOver={handle_drag_over}
            onDragEnd={handle_drag_end}
            onFocus={() => set_is_focused(true)}
            onBlur={() => set_is_focused(false)}
            className={cn(styles.input, {
              [styles['input--empty']]: !props.value
            })}
            data-placeholder={placeholder}
          />
        </div>

        {render_footer()}
      </div>
    </div>
  )
}
