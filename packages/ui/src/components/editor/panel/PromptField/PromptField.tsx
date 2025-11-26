import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import styles from './PromptField.module.scss'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { use_drag_drop } from './hooks/use-drag-drop'
import { DropdownMenu } from '../../common/DropdownMenu'
import { use_is_narrow_viewport, use_is_mac } from '@shared/hooks'
import { search_paths } from '@shared/utils/search-paths'
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
  const container_ref = useRef<HTMLDivElement>(null)
  const ghost_text_debounce_timer_ref = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [caret_position, set_caret_position] = useState(0)
  const [ghost_text, set_ghost_text] = useState('')
  const [show_at_sign_tooltip, set_show_at_sign_tooltip] = useState(false)
  const [show_submit_tooltip, set_show_submit_tooltip] = useState(false)
  const [is_text_selecting, set_is_text_selecting] = useState(false)
  const [is_focused, set_is_focused] = useState(false)
  const is_narrow_viewport = use_is_narrow_viewport(268)
  const {
    is_dropdown_open,
    toggle_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  } = use_dropdown(props)
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

  function handle_accept_ghost_text() {
    if (!ghost_text || !input_ref.current) return

    const ghost_node = input_ref.current.querySelector(
      'span[data-type="ghost-text"]'
    )
    if (ghost_node) {
      const text_node = document.createTextNode(ghost_node.textContent || '')
      ghost_node.parentNode?.replaceChild(text_node, ghost_node)

      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.setStartAfter(text_node)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      input_ref.current.dispatchEvent(
        new Event('input', { bubbles: true, cancelable: true })
      )
    }
  }

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
  const mod_key = is_mac ? '⌘' : 'Ctrl'

  const display_text = useMemo(() => {
    return get_display_text(props.value, props.context_file_paths ?? [])
  }, [props.value, props.context_file_paths])

  const show_file_match_hint = useMemo(() => {
    const value = display_text
    if (
      !value ||
      caret_position != value.length ||
      value.endsWith(' ') ||
      value.endsWith('\n') ||
      !props.context_file_paths
    ) {
      return false
    }

    // Check if cursor is at the end of a shortened filename
    const text_before_cursor = value.substring(0, caret_position)
    const filename_match = text_before_cursor.match(
      /([^\s,;:!?`]*\.[^\s,;:!?`]+)$/
    )

    if (filename_match) {
      const filename = filename_match[1]
      const is_shortened_filename = props.context_file_paths.some(
        (path) => path.endsWith('/' + filename) || path === filename
      )
      if (is_shortened_filename) {
        return false
      }
    }

    const last_word = value.trim().split(/\s+/).pop()

    if (last_word && last_word.length >= 3) {
      const matching_paths = search_paths({
        paths: props.context_file_paths,
        search_value: last_word
      })
      return matching_paths.length == 1
    }

    return false
  }, [display_text, caret_position, props.context_file_paths])

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

  const identifiers = useMemo(() => {
    if (!props.currently_open_file_text) return new Set<string>()
    const matches =
      props.currently_open_file_text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g)
    if (!matches) return new Set<string>()
    return new Set(matches.filter((id) => id.length >= 3))
  }, [props.currently_open_file_text])

  useEffect(() => {
    // Reset timer on any change
    if (ghost_text_debounce_timer_ref.current) {
      clearTimeout(ghost_text_debounce_timer_ref.current)
      ghost_text_debounce_timer_ref.current = null
    }

    // Calculate potential ghost text
    let potential_ghost_text = ''

    if (input_ref.current && is_focused) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        if (range.collapsed) {
          // Check if there's a character on the right side of the caret
          const post_caret_range = range.cloneRange()
          post_caret_range.selectNodeContents(input_ref.current)
          post_caret_range.setStart(range.endContainer, range.endOffset)
          const text_after_cursor = post_caret_range.toString()

          // Only allow ghost text if there's nothing after cursor or only whitespace
          if (text_after_cursor.trim() === '') {
            const pre_caret_range = range.cloneRange()
            pre_caret_range.selectNodeContents(input_ref.current)
            pre_caret_range.setEnd(range.startContainer, range.startOffset)
            const text_before_cursor = pre_caret_range.toString()
            const last_word_match = text_before_cursor.match(/[\S]+$/)

            if (last_word_match) {
              const last_word_with_prefix = last_word_match[0]
              const word_start_match =
                last_word_with_prefix.match(/[a-zA-Z_]/)
              if (word_start_match) {
                const last_word = last_word_with_prefix.substring(
                  word_start_match.index ?? 0
                )
                if (last_word.length >= 2) {
                  for (const id of identifiers) {
                    if (id.startsWith(last_word) && id !== last_word) {
                      potential_ghost_text = id.substring(last_word.length)
                      break
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Apply debounce logic
    if (potential_ghost_text) {
      if (ghost_text) {
        set_ghost_text(potential_ghost_text)
      } else {
        ghost_text_debounce_timer_ref.current = setTimeout(() => {
          set_ghost_text(potential_ghost_text)
        }, 500)
      }
    } else {
      set_ghost_text('')
    }

    return () => {
      if (ghost_text_debounce_timer_ref.current) {
        clearTimeout(ghost_text_debounce_timer_ref.current)
      }
    }
  }, [props.value, caret_position, identifiers, is_focused, ghost_text])

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

  useEffect(() => {
    const input = input_ref.current
    if (!input) return

    const existing_ghost = input.querySelector('span[data-type="ghost-text"]')
    if (existing_ghost) {
      const parent = existing_ghost.parentNode
      if (parent) {
        parent.removeChild(existing_ghost)
        parent.normalize()
      }
    }

    if (ghost_text) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        if (range.collapsed) {
          const span = document.createElement('span')
          span.dataset.type = 'ghost-text'
          span.textContent = ghost_text
          span.style.color = 'var(--vscode-editorGhostText-foreground, #888)'
          span.style.pointerEvents = 'none'

          range.insertNode(span)
          selection.collapse(range.startContainer, range.startOffset)
        }
      }
    }
  }, [ghost_text])

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
        ref={container_ref}
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
                          shortcut: is_mac ? `${mod_key} Return` : `${mod_key}+Enter`,
                          on_click: handle_select_click
                        },
                        {
                          label: 'Copy prompt',
                          shortcut: is_mac ? `${mod_key}⌥C` : `${mod_key}+Alt+C`,
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
