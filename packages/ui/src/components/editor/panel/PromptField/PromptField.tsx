import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import styles from './PromptField.module.scss'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { use_ghost_text } from './hooks/use-ghost-text'
import { use_drag_drop } from './hooks/use-drag-drop'
import { DropdownMenu } from '../../common/DropdownMenu'
import { use_is_narrow_viewport, use_is_mac } from '@shared/hooks'
import { get_display_text } from './utils/get-display-text'
import {
  get_caret_position_from_div,
  set_caret_position_for_div
} from './utils/caret'
import {
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos
} from './utils/position-mapping'
import { dictionary } from '@shared/constants/dictionary'
import { get_file_match_hint_data } from './utils/get-file-match-hint-data'

const Tooltip: React.FC<{
  message: string
  align: 'left' | 'right'
  is_warning?: boolean
  offset: number
}> = (params) => (
  <div
    className={cn(styles.tooltip, {
      [styles['tooltip--align-left']]: params.align == 'left',
      [styles['tooltip--align-right']]: params.align == 'right',
      [styles['tooltip--warning']]: params.is_warning
    })}
    style={
      params.offset !== undefined
        ? ({ '--tooltip-offset': `${params.offset}px` } as React.CSSProperties)
        : undefined
    }
  >
    {params.message}
  </div>
)

export type EditFormat = 'whole' | 'truncated' | 'diff'

export type PromptFieldProps = {
  value: string
  chat_history: string[]
  on_change: (value: string) => void
  on_submit: () => void
  on_submit_with_control: () => void
  on_copy: () => void
  is_connected: boolean
  is_in_code_completions_mode: boolean
  has_active_selection: boolean
  has_active_editor: boolean
  on_caret_position_change: (caret_position: number) => void
  is_web_mode: boolean
  on_search_click: () => void
  on_at_sign_click: () => void
  on_hash_sign_click: () => void
  on_curly_braces_click: () => void
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  focus_key?: number
  focus_and_select_key?: number
  last_choice_button_title?: string
  show_edit_format_selector?: boolean
  edit_format?: EditFormat
  on_edit_format_change?: (format: EditFormat) => void
  edit_format_instructions?: Record<EditFormat, string>
  context_file_paths?: string[]
  currently_open_file_text?: string
  on_go_to_file?: (file_path: string) => void
}

export const PromptField: React.FC<PromptFieldProps> = (props) => {
  const input_ref = useRef<HTMLDivElement>(null)
  const [caret_position, set_caret_position] = useState(0)
  const [show_at_sign_tooltip, set_show_at_sign_tooltip] = useState(false)
  const [show_submit_tooltip, set_show_submit_tooltip] = useState(false)
  const [is_text_selecting, set_is_text_selecting] = useState(false)
  const [is_focused, set_is_focused] = useState(false)
  const [show_file_match_hint, set_show_file_match_hint] = useState(false)
  const file_match_hint_timer_ref = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const has_shown_hint_once_ref = useRef(false)
  const last_matching_word_ref = useRef<string | null>(null)

  const is_narrow_viewport = use_is_narrow_viewport(268)
  const {
    is_dropdown_open,
    toggle_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  } = use_dropdown(props)
  const { ghost_text, handle_accept_ghost_text } = use_ghost_text({
    value: props.value,
    input_ref,
    is_focused,
    currently_open_file_text: props.currently_open_file_text,
    caret_position
  })
  const {
    handle_clear,
    handle_input_change,
    handle_submit,
    handle_key_down,
    is_history_enabled,
    handle_copy,
    handle_input_click
  } = use_handlers(props, input_ref, ghost_text, handle_accept_ghost_text)
  const { handle_drag_start, handle_drag_over, handle_drop, handle_drag_end } =
    use_drag_drop({
      input_ref,
      value: props.value,
      context_file_paths: props.context_file_paths,
      on_change: props.on_change
    })

  const mouse_down_pos_ref = useRef<{ x: number; y: number } | null>(null)

  const handle_mouse_down = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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

  const display_text = useMemo(() => {
    return get_display_text(props.value, props.context_file_paths ?? [])
  }, [props.value, props.context_file_paths])

  const should_show_hint = useMemo(() => {
    const hint_data = get_file_match_hint_data(
      display_text,
      caret_position,
      props.context_file_paths
    )
    return hint_data ? hint_data.word : false
  }, [display_text, caret_position, props.context_file_paths])

  useEffect(() => {
    if (file_match_hint_timer_ref.current) {
      clearTimeout(file_match_hint_timer_ref.current)
      file_match_hint_timer_ref.current = null
    }

    if (should_show_hint) {
      const matching_word = should_show_hint as string
      const is_same_word = matching_word === last_matching_word_ref.current
      if (has_shown_hint_once_ref.current && is_same_word) {
        set_show_file_match_hint(true)
      } else {
        file_match_hint_timer_ref.current = setTimeout(() => {
          set_show_file_match_hint(true)
          has_shown_hint_once_ref.current = true
          last_matching_word_ref.current = matching_word
        }, 300)
      }
    } else {
      set_show_file_match_hint(false)
      if (last_matching_word_ref.current !== null) {
        has_shown_hint_once_ref.current = false
        last_matching_word_ref.current = null
      }
    }

    return () => {
      if (file_match_hint_timer_ref.current) {
        clearTimeout(file_match_hint_timer_ref.current)
      }
    }
  }, [should_show_hint])

  const highlighted_html = useMemo(() => {
    return get_highlighted_text({
      text: props.value,
      is_in_code_completions_mode: props.is_in_code_completions_mode,
      has_active_selection: props.has_active_selection,
      context_file_paths: props.context_file_paths ?? []
    })
  }, [
    props.value,
    props.is_in_code_completions_mode,
    props.has_active_selection,
    props.context_file_paths
  ])

  useEffect(() => {
    if (input_ref.current && input_ref.current.innerHTML !== highlighted_html) {
      const selection_start = get_caret_position_from_div(input_ref.current)
      input_ref.current.innerHTML = highlighted_html
      set_caret_position_for_div(input_ref.current, selection_start)
    }
  }, [highlighted_html])

  useEffect(() => {
    if (input_ref.current) {
      if (
        props.caret_position_to_set !== undefined &&
        props.on_caret_position_set
      ) {
        const display_pos = map_raw_pos_to_display_pos(
          props.caret_position_to_set,
          props.value,
          props.context_file_paths ?? []
        )
        set_caret_position_for_div(input_ref.current, display_pos)
        props.on_caret_position_set()
      }
    }
  }, [
    props.caret_position_to_set,
    props.on_caret_position_set,
    props.value,
    props.context_file_paths
  ])

  useEffect(() => {
    if (input_ref.current) {
      input_ref.current.focus()
    }
  }, [props.focus_key])

  useEffect(() => {
    if (input_ref.current) {
      input_ref.current.focus()
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.selectNodeContents(input_ref.current)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, [props.focus_and_select_key])

  useEffect(() => {
    const input_element = input_ref.current
    if (input_element) {
      const is_focused = document.activeElement === input_element
      if (!is_focused) input_element.focus()
    }
  }, [props.value])

  useEffect(() => {
    const on_selection_change = () => {
      if (document.activeElement === input_ref.current && input_ref.current) {
        const pos = get_caret_position_from_div(input_ref.current)
        set_caret_position(pos)
        const raw_pos = map_display_pos_to_raw_pos(
          pos,
          props.value,
          props.context_file_paths ?? []
        )
        props.on_caret_position_change(raw_pos)
      }
    }
    document.addEventListener('selectionchange', on_selection_change)
    return () =>
      document.removeEventListener('selectionchange', on_selection_change)
  }, [props.on_caret_position_change, props.value, props.context_file_paths])

  const placeholder = useMemo(() => {
    const active_history = props.chat_history

    if (props.is_in_code_completions_mode) {
      if (active_history.length > 0 && is_history_enabled) {
        return 'Completion instructions (⇅ for history)'
      } else {
        return 'Completion instructions'
      }
    }

    return active_history.length > 0 && is_history_enabled
      ? 'Type something (⇅ for history)'
      : 'Type something'
  }, [
    props.is_in_code_completions_mode,
    props.chat_history,
    is_history_enabled
  ])

  const has_no_context =
    !props.context_file_paths || props.context_file_paths.length == 0

  return (
    <div className={styles.container}>
      {props.has_active_selection && props.is_in_code_completions_mode && (
        <div className={styles.error}>
          <div className={styles.error__inner}>Remove text selection</div>
        </div>
      )}

      {props.is_in_code_completions_mode && !props.has_active_editor && (
        <div className={styles.error}>
          <div className={styles.error__inner}>Place cursor for completion</div>
        </div>
      )}

      <div
        className={cn(styles.container__inner, {
          [styles['container__inner--disabled']]:
            props.is_in_code_completions_mode &&
            (props.has_active_selection || !props.has_active_editor),
          [styles['container__inner--selecting']]: is_text_selecting
        })}
        onKeyDown={(e) => {
          if (e.key == 'Escape' && !e.ctrlKey && !e.metaKey) {
            e.stopPropagation()
            return
          }
          if (e.key == 'f' && (e.ctrlKey || e.metaKey)) {
            e.stopPropagation()
            props.on_search_click()
          }
          if (e.key == 'c' && e.altKey && (e.ctrlKey || e.metaKey)) {
            if (props.on_copy) {
              e.stopPropagation()
              e.preventDefault()
              props.on_copy()
            }
          }
        }}
        onClick={() => input_ref.current?.focus()}
      >
        {props.value && (
          <button
            className={cn(styles['clear-button'], 'codicon', 'codicon-close')}
            onClick={() => {
              handle_clear()
              input_ref.current?.focus()
            }}
            title="Clear"
          />
        )}
        <div
          ref={input_ref}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onInput={handle_input_change}
          onKeyDown={handle_key_down}
          onCopy={handle_copy}
          onClick={handle_input_click}
          onMouseDown={handle_mouse_down}
          onDragStart={handle_drag_start}
          onDrop={handle_drop}
          onDragOver={handle_drag_over}
          onDragEnd={handle_drag_end}
          onFocus={() => set_is_focused(true)}
          onBlur={() => set_is_focused(false)}
          className={cn(styles.input, {
            [styles['input-with-file-match-hint']]: show_file_match_hint,
            [styles['input--empty']]: !props.value
          })}
          data-placeholder={placeholder}
        />

        <div
          className={styles.footer}
          onClick={() => {
            if (input_ref.current) {
              input_ref.current.focus()
              const selection = window.getSelection()
              if (selection) {
                const range = document.createRange()
                range.selectNodeContents(input_ref.current)
                selection.removeAllRanges()
                selection.addRange(range)
              }
            }
          }}
        >
          {show_at_sign_tooltip && (
            <Tooltip
              message={dictionary.warning_message.NOTHING_SELECTED_IN_CONTEXT.replace(
                '.',
                ''
              )}
              align="left"
              offset={8}
              is_warning
            />
          )}
          {props.last_choice_button_title && show_submit_tooltip && (
            <Tooltip
              message={props.last_choice_button_title}
              offset={28}
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
              onMouseEnter={() => {
                if (has_no_context) {
                  set_show_at_sign_tooltip(true)
                }
              }}
              onClick={() => {
                if (!has_no_context) {
                  props.on_at_sign_click()
                }
              }}
              onMouseLeave={() => set_show_at_sign_tooltip(false)}
              className={cn(styles['footer__left__button'])}
              title="Reference file"
            >
              <Icon variant="AT_SIGN" />
            </button>
            {!props.is_in_code_completions_mode && (
              <button
                onClick={props.on_hash_sign_click}
                className={cn(styles['footer__left__button'])}
                title="Insert symbol"
              >
                <Icon variant="HASH_SIGN" />
              </button>
            )}
            <button
              onClick={props.on_curly_braces_click}
              className={cn(styles['footer__left__button'])}
              title="Prompt templates"
            >
              <Icon variant="CURLY_BRACES" />
            </button>
            <span className={styles.icon}></span>
          </div>
          <div
            className={styles.footer__right}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {props.show_edit_format_selector && (
              <div className={styles['footer__right__edit-format']}>
                {(['whole', 'truncated', 'diff'] as const).map((format) => {
                  const button_text = is_narrow_viewport
                    ? format.charAt(0).toUpperCase()
                    : format
                  return (
                    <button
                      key={format}
                      className={cn(
                        styles['footer__right__edit-format__button'],
                        {
                          [styles[
                            'footer__right__edit-format__button--selected'
                          ]]: props.edit_format == format
                        }
                      )}
                      title={`"${props.edit_format_instructions?.[format]}"`}
                      onClick={() => props.on_edit_format_change?.(format)}
                      data-text={button_text}
                    >
                      {button_text}
                    </button>
                  )
                })}
              </div>
            )}

            <div className={styles['footer__right__submit']} ref={dropdown_ref}>
              {(!props.is_web_mode ||
                (props.is_web_mode && props.is_connected)) && (
                <>
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
                  <button
                    className={cn(
                      styles['footer__right__submit__button'],
                      styles['footer__right__submit__button--chevron']
                    )}
                    onClick={toggle_dropdown}
                    title="More actions"
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
                  {is_dropdown_open && (
                    <DropdownMenu
                      items={[
                        {
                          label: 'Select...',
                          shortcut: is_mac ? '⌘ Return' : 'Ctrl+Enter',
                          on_click: handle_select_click
                        },
                        {
                          label: 'Copy prompt',
                          shortcut: is_mac ? '⌘ C' : 'Ctrl+C',
                          on_click: handle_copy_click
                        }
                      ]}
                    />
                  )}
                </>
              )}
              {props.is_web_mode && !props.is_connected && (
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
                  title="Copy prompt"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
