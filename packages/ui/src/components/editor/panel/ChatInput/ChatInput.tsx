import { useRef, useEffect, useMemo } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'
import { Icon } from '../../common/Icon'
import { get_highlighted_text } from './utils/get-highlighted-text'
import { use_handlers } from './hooks/use-handlers'
import { format_token_count } from './utils/format-token-count'

export type ChatInputProps = {
  value: string
  chat_history: string[]
  on_change: (value: string) => void
  on_submit: () => void
  on_submit_with_control: () => void
  on_copy: () => void
  token_count?: number
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
  use_last_choice_button_title?: string
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const textarea_ref = useRef<HTMLTextAreaElement>(null)
  const highlight_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)

  const {
    handle_select,
    handle_input_change,
    handle_submit,
    handle_key_down,
    is_history_enabled
  } = use_handlers(props)

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
    is_history_enabled,
    props.is_web_mode
  ])

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
          onKeyDown={handle_key_down}
          onSelect={handle_select}
          autoFocus
          className={styles.textarea}
          minRows={2}
          disabled={
            props.is_in_code_completions_mode &&
            (props.has_active_selection || !props.has_active_editor)
          }
        />
        <button
          className={cn(
            styles['container__inner__search-button'],
            'codicon',
            'codicon-search'
          )}
          onClick={props.on_search_click}
          title={`Search history (${
            navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
              ? '⌘F'
              : 'Ctrl+F'
          })`}
        />

        {props.is_web_mode && props.is_connected && (
          <button
            className={cn(
              styles['container__inner__copy-button'],
              'codicon',
              'codicon-copy'
            )}
            onClick={(e) => {
              e.stopPropagation()
              props.on_copy()
            }}
            title={`Copy to clipboard (${
              navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
                ? '⌥⌘C'
                : 'Ctrl+Alt+C'
            })`}
          />
        )}

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
              onClick={props.on_at_sign_click}
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
            {props.token_count !== undefined && props.token_count > 1 && (
              <div
                className={styles.footer__right__count}
                title="Approximate message length in tokens"
              >
                {format_token_count(props.token_count)}
              </div>
            )}

            {(!props.is_web_mode ||
              (props.is_web_mode && props.is_connected)) && (
              <>
                <button
                  className={cn([
                    styles.footer__right__button,
                    styles['footer__right__button--secondary']
                  ])}
                  onClick={(e) => handle_submit(e, true)}
                >
                  {navigator.userAgent.toUpperCase().indexOf('MAC') >= 0 ? (
                    <Icon variant="COMMAND" />
                  ) : (
                    <div className={styles.footer__right__button__ctrl}>
                      Ctrl
                    </div>
                  )}
                  <Icon variant="ENTER" />
                  <span>Select...</span>
                </button>

                <button
                  className={styles.footer__right__button}
                  onClick={handle_submit}
                  title={props.use_last_choice_button_title}
                >
                  <Icon variant="ENTER" />
                  <span>Use last choice</span>
                </button>
              </>
            )}

            {props.is_web_mode && !props.is_connected && (
              <button
                className={styles.footer__right__button}
                onClick={(e) => {
                  e.stopPropagation()
                  props.on_copy()
                }}
                title="Copy to clipboard"
              >
                <Icon variant="ENTER" />
                <span>Copy to clipboard</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
