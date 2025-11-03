import { useRef, useEffect, useMemo } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { use_dropdown } from './hooks/use-dropdown'
import { DropdownMenu } from '../../common/DropdownMenu'

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
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const textarea_ref = useRef<HTMLTextAreaElement>(null)
  const highlight_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const {
    is_dropdown_open,
    toggle_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  } = use_dropdown(props)
  const {
    handle_clear,
    handle_select,
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

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
      if (
        props.caret_position_to_set !== undefined &&
        props.on_caret_position_set
      ) {
        textarea_ref.current.setSelectionRange(
          props.caret_position_to_set,
          props.caret_position_to_set
        )
        props.on_caret_position_set()
      }
    }
  }, [props.caret_position_to_set])

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
    }
  }, [props.focus_key])

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
      textarea_ref.current.select()
    }
  }, [props.focus_and_select_key])

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

  const custom_handle_key_down = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key == 'Tab' && !e.shiftKey) {
      const textarea = e.currentTarget
      const value = textarea.value
      const selection_start = textarea.selectionStart

      if (selection_start > 0) {
        const text_before_cursor = value.substring(0, selection_start)
        if (
          text_before_cursor.trim() !== '' &&
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
    handle_key_down(e)
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
      >
        {props.value && (
          <button
            className={cn(styles['clear-button'], 'codicon', 'codicon-close')}
            onClick={() => {
              handle_clear()
              textarea_ref.current?.focus()
            }}
            title="Clear"
          />
        )}
        <div className={styles['highlight-container']} ref={highlight_ref}>
          {get_highlighted_text({
            text: props.value,
            is_in_code_completions_mode: props.is_in_code_completions_mode,
            has_active_selection: props.has_active_selection
          })}
        </div>
        <TextareaAutosize
          ref={textarea_ref}
          placeholder={placeholder}
          value={props.value}
          onChange={handle_input_change}
          onKeyDown={custom_handle_key_down}
          onSelect={handle_select}
          autoFocus
          className={styles.textarea}
          minRows={2}
          disabled={
            props.is_in_code_completions_mode &&
            (props.has_active_selection || !props.has_active_editor)
          }
        />

        <div
          className={styles.footer}
          onClick={() => {
            textarea_ref.current?.select()
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
                    title={`Attached edit format instructions: ${props.edit_format_instructions?.[format]}`}
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
