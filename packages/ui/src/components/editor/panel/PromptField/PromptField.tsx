import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import styles from './PromptField.module.scss'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { use_ghost_text } from './hooks/use-ghost-text'
import { use_drag_drop } from './hooks/use-drag-drop'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { use_edit_format_compacting } from './hooks/use-edit-format-compacting'
import { DropdownMenu } from '../../common/DropdownMenu'
import { use_is_mac } from '@shared/hooks'
import {
  get_caret_position_from_div,
  set_caret_position_for_div
} from './utils/caret'
import {
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos
} from './utils/position-mapping'
import { Tooltip } from './components'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export type EditFormat = 'whole' | 'truncated' | 'diff' | 'before-after'

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
  is_web_mode: boolean
  on_at_sign_click: () => void
  on_hash_sign_click: () => void
  on_curly_braces_click: () => void
  send_with_shift_enter?: boolean
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  focus_key?: number
  focus_and_select_key?: number
  last_choice_button_title?: string
  show_edit_format_selector?: boolean
  edit_format?: EditFormat
  on_edit_format_change?: (format: EditFormat) => void
  context_file_paths?: string[]
  currently_open_file_path?: string
  currently_open_file_text?: string
  invocation_count: number
  on_invocation_count_change: (count: number) => void
  on_go_to_file: (file_path: string) => void
  prune_context_instructions_prefix: string
  on_prune_context_instructions_prefix_change: (value: string) => void
  on_pasted_lines_click: (path: string, start?: string, end?: string) => void
  on_open_url: (url: string) => void
  on_paste_image: (base64_content: string) => void
  on_open_image: (hash: string) => void
}

export const PromptField: React.FC<PromptFieldProps> = (props) => {
  const input_ref = useRef<HTMLDivElement>(null)
  const [caret_position, set_caret_position] = useState(0)
  const [should_show_ghost_text, set_should_show_ghost_text] = useState(false)
  const [show_submit_tooltip, set_show_submit_tooltip] = useState(false)
  const [is_text_selecting, set_is_text_selecting] = useState(false)
  const [is_focused, set_is_focused] = useState(false)
  const [is_invocation_dropdown_open, set_is_invocation_dropdown_open] =
    useState(false)
  const [hovered_edit_format, set_hovered_edit_format] =
    useState<EditFormat | null>(null)

  const [prune_instructions, set_prune_instructions] = useState(
    props.prune_context_instructions_prefix
  )

  useEffect(() => {
    set_prune_instructions(props.prune_context_instructions_prefix)
  }, [props.prune_context_instructions_prefix])

  const toggle_invocation_dropdown = useCallback(() => {
    set_is_invocation_dropdown_open((prev) => !prev)
  }, [])

  const { is_alt_pressed, handle_container_key_down } = use_keyboard_shortcuts({
    show_edit_format_selector: props.show_edit_format_selector,
    on_edit_format_change: props.on_edit_format_change,
    on_copy: props.on_copy,
    on_invocation_count_change: props.on_invocation_count_change,
    is_invocation_dropdown_open,
    on_toggle_invocation_dropdown: toggle_invocation_dropdown
  })
  const {
    is_dropdown_open,
    toggle_dropdown,
    close_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  } = use_dropdown(props)
  const invocation_dropdown_ref = useRef<HTMLDivElement>(null)
  const { ghost_text, handle_accept_ghost_text } = use_ghost_text({
    value: props.value,
    input_ref,
    is_focused: is_focused && should_show_ghost_text,
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
    handle_cut,
    handle_paste,
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
      context_file_paths: props.context_file_paths ?? [],
      is_web_mode: props.is_web_mode
    })
  }, [
    props.value,
    props.prompt_type,
    props.current_selection,
    props.context_file_paths,
    props.is_web_mode
  ])

  useEffect(() => {
    if (input_ref.current && input_ref.current.innerHTML !== highlighted_html) {
      const is_focused = document.activeElement === input_ref.current
      const selection_start = get_caret_position_from_div(input_ref.current)
      input_ref.current.innerHTML = highlighted_html
      if (is_focused) {
        set_caret_position_for_div(input_ref.current, selection_start)
      }
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
      const handle_click_outside = (event: MouseEvent) => {
        if (
          invocation_dropdown_ref.current &&
          !invocation_dropdown_ref.current.contains(event.target as Node)
        ) {
          set_is_invocation_dropdown_open(false)
        }
      }

      if (is_invocation_dropdown_open) {
        document.addEventListener('mousedown', handle_click_outside)
      }
      return () => {
        document.removeEventListener('mousedown', handle_click_outside)
      }
    }
  }, [is_invocation_dropdown_open])

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
    if (props.prompt_type == 'code-at-cursor') {
      if (props.chat_history.length > 0 && is_history_enabled) {
        return 'Completion instructions (⇅ for history)'
      } else {
        return 'Completion instructions'
      }
    }

    return props.chat_history.length > 0 && is_history_enabled
      ? 'Type something (⇅ for history)'
      : 'Type something'
  }, [props.prompt_type, props.chat_history, is_history_enabled])

  const edit_format_shortcuts: Record<EditFormat, string> = useMemo(() => {
    const modifier = is_mac ? '⌥' : 'Alt+'
    return {
      whole: `(${modifier}W)`,
      truncated: `(${modifier}T)`,
      'before-after': `(${modifier}B)`,
      diff: `(${modifier}D)`
    }
  }, [is_mac])

  const {
    container_ref,
    compact_step,
    format_whole_ref,
    format_truncated_ref,
    format_before_after_ref,
    format_diff_ref
  } = use_edit_format_compacting()

  return (
    <div className={styles.container}>
      {!!props.current_selection && props.prompt_type == 'code-at-cursor' && (
        <div className={styles.error}>
          <div className={styles.error__inner}>Remove text selection</div>
        </div>
      )}

      {props.prompt_type == 'code-at-cursor' &&
        !props.currently_open_file_path && (
          <div className={styles.error}>
            <div className={styles.error__inner}>
              Place cursor for completion
            </div>
          </div>
        )}

      <div
        className={cn(styles.container__inner, {
          [styles['container__inner--disabled']]:
            props.prompt_type == 'code-at-cursor' &&
            (!!props.current_selection || !props.currently_open_file_path),
          [styles['container__inner--selecting']]: is_text_selecting
        })}
        onKeyDown={handle_container_key_down}
        onClick={() => input_ref.current?.focus()}
      >
        {props.prompt_type == 'prune-context' && (
          <TextareaAutosize
            className={styles['prune-context-prefix']}
            value={prune_instructions}
            onChange={(e) => {
              set_prune_instructions(e.target.value)
            }}
            onBlur={(e) => {
              props.on_prune_context_instructions_prefix_change(
                prune_instructions
              )
              if (!e.target.value) {
                set_prune_instructions(props.prune_context_instructions_prefix)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className={styles['input-wrapper']}>
          {props.value && (
            <button
              className={cn(styles['clear-button'], 'codicon', 'codicon-close')}
              onClick={() => {
                set_should_show_ghost_text(false)
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
            onInput={(e) => {
              set_should_show_ghost_text(true)
              handle_input_change(e)
            }}
            onKeyDown={(e) => {
              if (e.key == 'ArrowRight') {
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
              onClick={() => {
                props.on_at_sign_click()
              }}
              className={cn(styles['footer__left__button'])}
              title="Reference File"
            >
              <Icon variant="AT_SIGN" />
            </button>
            <button
              onClick={props.on_hash_sign_click}
              className={cn(styles['footer__left__button'])}
              title="Insert Symbol"
            >
              <Icon variant="HASH_SIGN" />
            </button>
            <button
              onClick={props.on_curly_braces_click}
              className={cn(styles['footer__left__button'])}
              title="Prompt Templates"
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
            <div
              className={styles['footer__right__edit-format']}
              ref={container_ref}
              style={{
                display: props.show_edit_format_selector ? 'flex' : 'none'
              }}
            >
              {(['whole', 'truncated', 'before-after', 'diff'] as const).map(
                (format) => {
                  const is_compact =
                    (format == 'before-after' && compact_step >= 1) ||
                    (format == 'truncated' && compact_step >= 2) ||
                    (format == 'whole' && compact_step >= 3) ||
                    (format == 'diff' && compact_step >= 4)

                  const button_text = is_compact
                    ? format == 'before-after'
                      ? 'b/a'
                      : format.charAt(0)
                    : format == 'before-after'
                      ? 'before/after'
                      : format

                  const is_selected = props.edit_format == format
                  const should_underline = is_alt_pressed && !is_selected

                  let ref = null
                  if (format == 'whole') ref = format_whole_ref
                  if (format == 'truncated') ref = format_truncated_ref
                  if (format == 'before-after') ref = format_before_after_ref
                  if (format == 'diff') ref = format_diff_ref

                  return (
                    <button
                      ref={ref}
                      key={format}
                      className={cn(
                        styles['footer__right__edit-format__button'],
                        {
                          [styles[
                            'footer__right__edit-format__button--selected'
                          ]]: is_selected
                        }
                      )}
                      title={`Edit format instructions to include with the prompt ${edit_format_shortcuts[format]}`}
                      onClick={() => props.on_edit_format_change?.(format)}
                      onMouseEnter={() => set_hovered_edit_format(format)}
                      onMouseLeave={() => set_hovered_edit_format(null)}
                    >
                      {is_compact && hovered_edit_format == format && (
                        <Tooltip
                          message={
                            format == 'before-after'
                              ? 'Before and After'
                              : format.charAt(0).toUpperCase() + format.slice(1)
                          }
                          align="center"
                        />
                      )}
                      <span
                        className={
                          styles['footer__right__edit-format__button__spacer']
                        }
                      >
                        {button_text}
                      </span>
                      <span
                        className={
                          styles['footer__right__edit-format__button__text']
                        }
                      >
                        {should_underline ? (
                          <>
                            <span className={styles['underlined']}>
                              {button_text.charAt(0)}
                            </span>
                            {button_text.substring(1)}
                          </>
                        ) : (
                          button_text
                        )}
                      </span>
                    </button>
                  )
                }
              )}
            </div>

            <div className={styles['footer__right__submit']} ref={dropdown_ref}>
              {(!props.is_web_mode ||
                (props.is_web_mode && props.is_connected)) && (
                <>
                  {!(
                    props.prompt_type == 'prune-context' && !props.is_web_mode
                  ) && (
                    <div
                      className={styles['footer__right__invocation-count']}
                      ref={invocation_dropdown_ref}
                    >
                      <button
                        className={cn(
                          styles['footer__right__submit__button'],
                          styles['footer__right__invocation-count__button']
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          set_is_invocation_dropdown_open((prev) => !prev)
                          close_dropdown()
                        }}
                        title={`Invocation count ${is_mac ? '(⌥X 1-5)' : '(Alt+X 1-5)'}`}
                      >
                        {props.invocation_count}×
                      </button>
                      {is_invocation_dropdown_open && (
                        <DropdownMenu
                          items={[1, 2, 3, 4, 5].map((count) => ({
                            label: `${count}×`,
                            checked: count == props.invocation_count,
                            shortcut: is_mac ? `⌥X ${count}` : `Alt+X ${count}`,
                            on_click: () => {
                              props.on_invocation_count_change(count)
                              set_is_invocation_dropdown_open(false)
                            }
                          }))}
                        />
                      )}
                    </div>
                  )}
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
                    onClick={() => {
                      toggle_dropdown()
                      set_is_invocation_dropdown_open(false)
                    }}
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
                          shortcut: is_mac ? '⌘↩' : 'Ctrl+Enter',
                          on_click: handle_select_click
                        },
                        {
                          label: 'Copy prompt',
                          shortcut: is_mac ? '⌘C' : 'Ctrl+C',
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
