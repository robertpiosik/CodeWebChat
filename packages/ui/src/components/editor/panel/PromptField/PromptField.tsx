import { useRef, useEffect, useMemo, useState } from 'react'
import styles from './PromptField.module.scss'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { DropdownMenu } from '../../common/DropdownMenu'
import { use_is_narrow_viewport } from '@shared/hooks'
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
  on_at_sign_click: (search_value?: string) => void
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
  on_go_to_file?: (file_path: string) => void
}

export const PromptField: React.FC<PromptFieldProps> = (props) => {
  const input_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const [caret_position, set_caret_position] = useState(0)
  const [show_at_sign_tooltip, set_show_at_sign_tooltip] = useState(false)
  const [show_submit_tooltip, set_show_submit_tooltip] = useState(false)
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
    is_history_enabled
  } = use_handlers(props, input_ref) // No change to signature, logic moved inside

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

  const apply_deletion = (start_pos: number, end_pos: number) => {
    let leading_part = props.value.substring(0, start_pos)
    let trailing_part = props.value.substring(end_pos)

    // Handle spacing
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

  const handle_keyword_deletion = (clicked_element: HTMLElement) => {
    const input_element = input_ref.current
    if (!input_element) return

    // Find the keyword element
    const keyword_element = clicked_element.closest(
      `.${styles['keyword']}`
    ) as HTMLElement

    if (!keyword_element) return

    // Check if it's a file keyword
    if (keyword_element.classList.contains(styles['keyword--file'])) {
      const file_path = keyword_element.getAttribute('title')
      if (!file_path || !props.context_file_paths?.includes(file_path)) return

      // Find this file path in the raw value
      const search_pattern = `\`${file_path}\``
      const start_index = props.value.indexOf(search_pattern)

      if (start_index !== -1) {
        apply_deletion(start_index, start_index + search_pattern.length)
      }
    }
    // Check if it's a changes keyword
    else if (keyword_element.classList.contains(styles['keyword--changes'])) {
      const branch_name = keyword_element.dataset.branchName
      if (!branch_name) return

      const search_pattern = `#Changes:${branch_name}`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index !== -1) {
        apply_deletion(start_index, start_index + search_pattern.length)
      }
    }
    // Check if it's a saved context keyword
    else if (
      keyword_element.classList.contains(styles['keyword--saved-context'])
    ) {
      const context_type = keyword_element.dataset.contextType
      const context_name = keyword_element.dataset.contextName
      if (!context_type || !context_name) return

      const search_pattern = `#SavedContext:${context_type} "${context_name}"`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index !== -1) {
        apply_deletion(start_index, start_index + search_pattern.length)
      }
    }
    // Check if it's a selection keyword
    else if (keyword_element.classList.contains(styles['keyword--selection'])) {
      const search_pattern = '#Selection'
      const start_index = props.value.indexOf(search_pattern)

      if (start_index !== -1) {
        apply_deletion(start_index, start_index + search_pattern.length)
      }
    }
    // Check if it's a commit keyword
    else if (keyword_element.classList.contains(styles['keyword--commit'])) {
      const repo_name = keyword_element.dataset.repoName
      const commit_hash = keyword_element.dataset.commitHash
      const commit_message = keyword_element.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) return

      const search_pattern = `#Commit:${repo_name}:${commit_hash} "${commit_message}"`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index !== -1) {
        apply_deletion(start_index, start_index + search_pattern.length)
      }
    }
  }

  const handle_input_click = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const icon_element = target.closest(`.${styles['keyword__icon']}`)
    const text_element = target.closest(`.${styles['keyword__text']}`)

    if (icon_element) {
      e.preventDefault()
      e.stopPropagation()
      handle_keyword_deletion(icon_element as HTMLElement)
    } else if (text_element) {
      // Clicking on file name text should open the file
      e.preventDefault()
      e.stopPropagation()

      const file_keyword_element = text_element.closest<HTMLElement>(
        `.${styles['keyword--file']}`
      )
      if (file_keyword_element) {
        const file_path = file_keyword_element.getAttribute('title')
        if (file_path && props.on_go_to_file) {
          props.on_go_to_file(file_path)
        }
      }

      // Keep focus on input
      if (input_ref.current) {
        input_ref.current.focus()
      }
    }
  }

  const handle_copy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
      return

    const range = selection.getRangeAt(0)
    const input_element = input_ref.current
    if (!input_element || !input_element.contains(range.startContainer)) return

    e.preventDefault()

    const pre_selection_range = document.createRange()
    pre_selection_range.selectNodeContents(input_element)
    pre_selection_range.setEnd(range.startContainer, range.startOffset)
    const display_start = pre_selection_range.toString().length

    pre_selection_range.setEnd(range.endContainer, range.endOffset)
    const display_end = pre_selection_range.toString().length

    const raw_start = map_display_pos_to_raw_pos(
      display_start,
      props.value,
      props.context_file_paths ?? []
    )
    const raw_end = map_display_pos_to_raw_pos(
      display_end,
      props.value,
      props.context_file_paths ?? []
    )

    const raw_text_slice = props.value.substring(raw_start, raw_end)
    e.clipboardData.setData('text/plain', raw_text_slice)
  }

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
          onKeyDown={handle_key_down}
          onCopy={handle_copy}
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
          {show_at_sign_tooltip && (
            <Tooltip
              message={dictionary.warning_message.NOTHING_SELECTED_IN_CONTEXT}
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
