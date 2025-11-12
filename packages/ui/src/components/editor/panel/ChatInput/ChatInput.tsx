import { useRef, useEffect, useMemo, useState } from 'react'
import styles from './ChatInput.module.scss'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { DropdownMenu } from '../../common/DropdownMenu'
import { search_paths } from '@shared/utils/search-paths'
import { get_display_text } from './utils/get-display-text'

export type EditFormat = 'whole' | 'truncated' | 'diff'

export type ChatInputProps = {
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
  on_at_sign_click: (search_value?: string) => void
  on_hash_sign_click: () => void
  on_curly_braces_click: () => void
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  focus_key?: number
  focus_and_select_key?: number
  use_last_choice_button_title?: string
  show_edit_format_selector?: boolean
  edit_format?: EditFormat
  on_edit_format_change?: (format: EditFormat) => void
  edit_format_instructions?: Record<EditFormat, string>
  context_file_paths?: string[]
}

const get_caret_position_from_div = (element: HTMLElement): number => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount == 0) {
    return 0
  }
  const range = selection.getRangeAt(0)
  const pre_caret_range = range.cloneRange()
  pre_caret_range.selectNodeContents(element)
  pre_caret_range.setEnd(range.endContainer, range.endOffset)
  return pre_caret_range.toString().length
}

const set_caret_position_for_div = (element: HTMLElement, position: number) => {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  let char_count = 0
  let found = false

  const find_text_node_and_offset = (node: Node) => {
    if (found) return
    if (node.nodeType == Node.TEXT_NODE) {
      const text_node = node as Text
      const next_char_count = char_count + text_node.length
      if (position >= char_count && position <= next_char_count) {
        range.setStart(node, position - char_count)
        range.collapse(true)
        found = true
      } else {
        char_count = next_char_count
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        find_text_node_and_offset(node.childNodes[i])
        if (found) break
      }
    }
  }

  find_text_node_and_offset(element)
  if (found) {
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

const map_display_pos_to_raw_pos = (
  display_pos: number,
  raw_text: string,
  context_file_paths: string[]
): number => {
  let raw_pos = 0
  let current_display_pos = 0
  let last_raw_index = 0

  const regex = /`([^\s`]*\.[^\s`]+)`/g
  let match

  while ((match = regex.exec(raw_text)) !== null) {
    const file_path = match[1]
    if (context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      const raw_match_length = match[0].length
      const display_match_length = filename.length

      const text_before_length = match.index - last_raw_index

      if (display_pos <= current_display_pos + text_before_length) {
        return raw_pos + (display_pos - current_display_pos)
      }

      current_display_pos += text_before_length
      raw_pos += text_before_length

      if (display_pos <= current_display_pos + display_match_length) {
        const pos_in_filename = display_pos - current_display_pos
        if (pos_in_filename < display_match_length) {
          // Cursor is inside the displayed filename. Map to the start of the raw path string.
          return raw_pos
        } else {
          // Cursor is at the end of the displayed filename. Map to the end of the raw path string.
          return raw_pos + raw_match_length
        }
      }

      current_display_pos += display_match_length
      raw_pos += raw_match_length
      last_raw_index = regex.lastIndex
    }
  }

  // Cursor is in the text after all matches
  return raw_pos + (display_pos - current_display_pos)
}

const map_raw_pos_to_display_pos = (
  raw_pos: number,
  raw_text: string,
  context_file_paths: string[]
): number => {
  let display_pos = 0
  let current_raw_pos = 0
  let last_raw_index = 0

  const regex = /`([^\s`]*\.[^\s`]+)`/g
  let match

  while ((match = regex.exec(raw_text)) !== null) {
    const file_path = match[1]
    if (context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      const raw_match_length = match[0].length
      const display_match_length = filename.length
      const text_before_length = match.index - last_raw_index
      if (raw_pos <= current_raw_pos + text_before_length) {
        return display_pos + (raw_pos - current_raw_pos)
      }
      current_raw_pos += text_before_length
      display_pos += text_before_length
      if (raw_pos <= current_raw_pos + raw_match_length) {
        return display_pos + display_match_length
      }
      current_raw_pos += raw_match_length
      display_pos += display_match_length
      last_raw_index = regex.lastIndex
    }
  }
  return display_pos + (raw_pos - current_raw_pos)
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const input_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const [caret_position, set_caret_position] = useState(0)
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
    is_history_enabled
  } = use_handlers(props)

  const is_mac = useMemo(() => {
    if (typeof navigator == 'undefined') return false
    const any_nav = navigator as any
    const uach_platform: string | undefined = any_nav?.userAgentData?.platform
    if (typeof uach_platform == 'string') {
      return uach_platform.toLowerCase().includes('mac')
    }
    if (typeof navigator.userAgent == 'string') {
      return /mac/i.test(navigator.userAgent)
    }
    return false
  }, [])
  const mod_key = is_mac ? 'cmd' : 'ctrl'

  const display_text = useMemo(() => {
    return get_display_text(props.value, props.context_file_paths ?? [])
  }, [props.value, props.context_file_paths])

  const show_tab_hint = useMemo(() => {
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
      /([^\s,;:.!?`]*\.[^\s,;:.!?`]+)$/
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
      text: display_text,
      is_in_code_completions_mode: props.is_in_code_completions_mode,
      has_active_selection: props.has_active_selection,
      context_file_paths: props.context_file_paths ?? []
    })
  }, [
    display_text,
    props.is_in_code_completions_mode,
    props.has_active_selection,
    props.context_file_paths
  ])

  useEffect(() => {
    const input_element = input_ref.current
    if (input_element && input_element.innerHTML !== highlighted_html) {
      const selection_start = get_caret_position_from_div(input_element)
      input_element.innerHTML = highlighted_html
      set_caret_position_for_div(input_element, selection_start)
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

  const custom_handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key == 'Tab' && !e.shiftKey) {
      const value = e.currentTarget.innerText
      const selection_start = caret_position

      if (selection_start > 0) {
        const text_before_cursor = value.substring(0, selection_start)
        if (
          text_before_cursor.trim() != '' &&
          !/\s$/.test(text_before_cursor)
        ) {
          e.preventDefault()
          const match = text_before_cursor.match(/(\S+)$/)
          if (match) {
            props.on_at_sign_click(match[1])
            return
          }
        }
      }
    }

    // Handle backspace on shortened filenames
    if (e.key == 'Backspace' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const display_value = e.currentTarget.innerText
      const cursor_pos = caret_position

      // Check if we're at the end of a word that looks like a filename
      if (cursor_pos > 0) {
        const text_before = display_value.substring(0, cursor_pos)
        const filename_match = text_before.match(
          /([^\s,;:.!?`]*\.[^\s,;:.!?`]+)$/
        )

        if (filename_match) {
          const filename = filename_match[1]
          const matching_path = props.context_file_paths?.find(
            (path) => path.endsWith('/' + filename) || path === filename
          )

          if (matching_path) {
            e.preventDefault()
            const new_value = props.value.replace(`\`${matching_path}\``, '')
            props.on_change(new_value)
            return
          }
        }
      }
    }

    handle_key_down(e)
  }

  const handle_input_click = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.classList.contains(styles['file-keyword'])) {
      e.preventDefault()
      e.stopPropagation()

      const input_element = input_ref.current
      if (!input_element) return

      const display_pos = get_caret_position_from_div(input_element)
      const raw_pos = map_display_pos_to_raw_pos(
        display_pos,
        props.value,
        props.context_file_paths ?? []
      )

      let start_of_path = -1
      let end_of_path = -1

      if (props.value[raw_pos] === '`') {
        // case: raw_pos at start
        start_of_path = raw_pos
        end_of_path = props.value.indexOf('`', start_of_path + 1)
      } else if (raw_pos > 0 && props.value[raw_pos - 1] === '`') {
        // case: raw_pos at end
        end_of_path = raw_pos - 1
        const text_before = props.value.substring(0, end_of_path)
        start_of_path = text_before.lastIndexOf('`')
      }

      if (
        start_of_path !== -1 &&
        end_of_path !== -1 &&
        start_of_path < end_of_path
      ) {
        const path_in_backticks = props.value.substring(
          start_of_path + 1,
          end_of_path
        )
        if (props.context_file_paths?.includes(path_in_backticks)) {
          let leading_part = props.value.substring(0, start_of_path)
          let trailing_part = props.value.substring(end_of_path + 1)

          // Handle spacing.
          if (leading_part.endsWith(' ')) {
            leading_part = leading_part.slice(0, -1)
          } else if (trailing_part.startsWith(' ')) {
            trailing_part = trailing_part.substring(1)
          }

          const new_value = leading_part + trailing_part
          const new_raw_cursor_pos = leading_part.length
          props.on_change(new_value)

          setTimeout(() => {
            if (input_ref.current) {
              const display_pos = map_raw_pos_to_display_pos(
                new_raw_cursor_pos,
                new_value,
                props.context_file_paths ?? []
              )
              set_caret_position_for_div(input_ref.current, display_pos)
            }
          }, 0)
        }
      }
    }
  }

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
            (props.has_active_selection || !props.has_active_editor)
        })}
        onKeyDown={(e) => {
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
          onKeyDown={custom_handle_key_down}
          onClick={handle_input_click}
          className={cn(styles.input, {
            [styles['input-with-tab-hint']]: show_tab_hint,
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
          <div
            className={styles.footer__left}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <button
              onClick={() => props.on_at_sign_click()}
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
          </div>
          <div
            className={styles.footer__right}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {props.show_edit_format_selector && (
              <div className={styles['footer__right__edit-format']}>
                {(['whole', 'truncated', 'diff'] as const).map((format) => (
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
                    data-text={format}
                  >
                    {format}
                  </button>
                ))}
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
                    title={props.use_last_choice_button_title}
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
                          shortcut: `${mod_key}+${is_mac ? 'return' : 'enter'}`,
                          on_click: handle_select_click
                        },
                        {
                          label: 'Copy prompt',
                          shortcut: `${mod_key}+${is_mac ? 'option' : 'alt'}+c`,
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
