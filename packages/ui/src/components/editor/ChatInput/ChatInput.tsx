import { useRef, useEffect, useMemo, useState } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'
import { Icon } from '../Icon'

type Props = {
  value: string
  chat_history: string[]
  on_change: (value: string) => void
  on_submit: () => void
  on_submit_with_control: () => void
  on_copy?: () => void
  token_count?: number
  is_connected: boolean
  submit_disabled_title?: string
  is_in_code_completions_mode: boolean
  has_active_selection: boolean
  has_active_editor: boolean
  on_caret_position_change: (caret_position: number) => void
  is_web_mode: boolean
  on_search_click: () => void
  on_at_sign_click: () => void
  translations: {
    type_something: string
    optional_suggestions: string
    send_request: string
    initialize_chat: string
    select_preset: string
    select_config: string
    code_completions_mode_unavailable_with_text_selection: string
    code_completions_mode_unavailable_without_active_editor: string
    search: string
  }
}

const format_token_count = (count?: number) => {
  if (!count) return undefined
  if (count < 1000) {
    return count.toString()
  } else {
    return Math.floor(count / 1000) + 'K+'
  }
}

export const ChatInput: React.FC<Props> = (props) => {
  const textarea_ref = useRef<HTMLTextAreaElement>(null)
  const highlight_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const [history_index, set_history_index] = useState(-1)
  const [is_history_enabled, set_is_history_enabled] = useState(!props.value)

  useEffect(() => {
    if (
      textarea_ref.current &&
      document.activeElement !== textarea_ref.current
    ) {
      textarea_ref.current.focus()
    }
  }, [props.value])

  const get_highlighted_text = (text: string) => {
    if (props.is_in_code_completions_mode) {
      return <span>{text}</span>
    }

    const regex =
      /(@Selection|@Changes:\S+(?:\/\S+)?|@SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+")/g
    const parts = text.split(regex)
    return parts.map((part, index) => {
      if (part == '@Selection') {
        const is_clickable = !!props.on_at_sign_click
        return (
          <span
            key={index}
            className={cn(
              styles['selection-keyword'],
              {
                [styles['selection-keyword--error']]:
                  !props.has_active_selection
              },
              { [styles['selection-keyword--clickable']]: is_clickable }
            )}
            title={
              is_clickable
                ? 'Click to remove @Selection'
                : !props.has_active_selection
                ? 'No active selection in editor'
                : undefined
            }
          >
            {part}
          </span>
        )
      }
      if (part && /^@Changes:\S+(?:\/\S+)?$/.test(part)) {
        return (
          <span key={index} className={styles['selection-keyword']}>
            {part}
          </span>
        )
      }
      if (
        part &&
        /^@SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
      ) {
        return (
          <span key={index} className={styles['selection-keyword']}>
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const handle_select = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const caret_position = textarea.selectionStart
    props.on_caret_position_change(caret_position)
  }

  const handle_input_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const new_value = e.target.value
    props.on_change(new_value)
    set_history_index(-1)

    const textarea = e.target
    const caret_position = textarea.selectionStart
    if (new_value.charAt(caret_position - 1) == '@') {
      setTimeout(() => {
        props.on_at_sign_click()
      }, 150)
    }

    if (!new_value) {
      set_is_history_enabled(true)
    }
  }

  const handle_submit = (
    e:
      | React.KeyboardEvent<HTMLTextAreaElement>
      | React.MouseEvent<HTMLButtonElement>,
    with_control?: boolean
  ) => {
    e.stopPropagation()
    if (
      (!props.is_connected && props.is_web_mode) ||
      (!props.is_in_code_completions_mode && !props.value)
    )
      return
    if (with_control || e.ctrlKey || e.metaKey) {
      props.on_submit_with_control()
    } else {
      props.on_submit()
    }
    set_history_index(-1)
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key == 'Enter' && e.shiftKey) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const new_value =
        props.value.substring(0, start) + '\n' + props.value.substring(end)

      props.on_change(new_value)
      set_is_history_enabled(false)

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    } else if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_submit(e)
    } else if (
      (e.key == 'ArrowUp' || e.key == 'ArrowDown') &&
      is_history_enabled
    ) {
      const active_history = props.chat_history

      if (active_history.length == 0) return

      e.preventDefault()

      if (e.key == 'ArrowUp') {
        if (history_index < active_history.length - 1) {
          const new_index = history_index + 1
          set_history_index(new_index)
          props.on_change(active_history[new_index])
        }
      } else if (e.key == 'ArrowDown') {
        if (history_index > 0) {
          const new_index = history_index - 1
          set_history_index(new_index)
          props.on_change(active_history[new_index])
        } else if (history_index === 0) {
          set_history_index(-1)
          props.on_change('')
        }
      }
    } else if (props.value) {
      set_is_history_enabled(false)
    }
  }

  const handle_container_click = () => {
    textarea_ref.current?.focus()
  }

  const placeholder = useMemo(() => {
    const active_history = props.chat_history

    if (props.is_in_code_completions_mode) {
      if (active_history.length > 0 && is_history_enabled) {
        return `${props.translations.optional_suggestions} (⇅ for history)`
      } else {
        return props.translations.optional_suggestions
      }
    }

    return active_history.length > 0 && is_history_enabled
      ? `${props.translations.type_something} (⇅ for history)`
      : props.translations.type_something
  }, [
    props.is_in_code_completions_mode,
    props.chat_history,
    is_history_enabled,
    props.is_web_mode
  ])

  return (
    <div className={styles.container}>
      {props.has_active_selection && props.is_in_code_completions_mode && (
        <div className={styles.container__error}>
          {
            props.translations
              .code_completions_mode_unavailable_with_text_selection
          }
        </div>
      )}

      {props.is_in_code_completions_mode && !props.has_active_editor && (
        <div className={styles.container__error}>
          {
            props.translations
              .code_completions_mode_unavailable_without_active_editor
          }
        </div>
      )}

      <div
        className={cn(styles.container__inner, {
          [styles['container__inner--disabled']]:
            props.is_in_code_completions_mode &&
            (props.has_active_selection || !props.has_active_editor)
        })}
        onClick={handle_container_click}
        onKeyDown={(e) => {
          if (e.key == 'f' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            props.on_search_click()
          }
        }}
        tabIndex={0}
        ref={container_ref}
      >
        <div
          className={styles['highlight-container']}
          ref={highlight_ref}
          onClick={() => {
            if (props.value.includes('@Selection') && props.on_at_sign_click)
              props.on_at_sign_click()
          }}
        >
          {get_highlighted_text(props.value)}
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
          title={`${props.translations.search} (${
            navigator.userAgent.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'
          }F)`}
        ></button>

        <div className={styles.footer}>
          <div className={styles.footer__left}>
            {!props.is_in_code_completions_mode && (
              <button
                onClick={props.on_at_sign_click}
                className={cn(styles['footer__left__at-sign-button'])}
                title="Insert symbol"
              >
                <span>@</span>
              </button>
            )}
          </div>
          <div className={styles.footer__right}>
            {props.token_count !== undefined && props.token_count > 1 && (
              <div
                className={styles.footer__right__count}
                title="Approximate message length in tokens"
              >
                {format_token_count(props.token_count)}
              </div>
            )}

            {props.on_copy && (
              <button
                className={styles['footer__right__icon-button']}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!props.is_in_code_completions_mode && !props.value) return
                  props.on_copy!()
                }}
                title={
                  !props.value
                    ? props.submit_disabled_title
                    : 'Copy to clipboard'
                }
                disabled={!props.is_in_code_completions_mode && !props.value}
              >
                <div className={cn('codicon', 'codicon-copy')} />
              </button>
            )}

            <button
              className={cn([
                styles.footer__right__button,
                styles['footer__right__button--secondary']
              ])}
              onClick={(e) => handle_submit(e, true)}
              disabled={
                (!props.is_connected && props.is_web_mode) ||
                (!props.is_in_code_completions_mode && !props.value)
              }
              title={
                !props.is_connected ||
                (!props.is_in_code_completions_mode && !props.value)
                  ? props.submit_disabled_title
                  : props.is_web_mode
                  ? props.translations.select_preset
                  : props.translations.select_config
              }
            >
              {navigator.userAgent.toUpperCase().indexOf('MAC') >= 0 ? (
                <Icon variant="COMMAND" />
              ) : (
                <div className={styles.footer__right__button__ctrl}>Ctrl</div>
              )}
              <Icon variant="ENTER" />
              <span>
                {props.is_web_mode
                  ? props.translations.select_preset
                  : props.translations.select_config}
              </span>
            </button>

            <button
              className={styles.footer__right__button}
              onClick={handle_submit}
              disabled={
                (!props.is_connected && props.is_web_mode) ||
                (!props.is_in_code_completions_mode && !props.value)
              }
              title={
                !props.is_connected ||
                (!props.is_in_code_completions_mode && !props.value)
                  ? props.submit_disabled_title
                  : props.is_web_mode
                  ? props.translations.initialize_chat
                  : props.translations.send_request
              }
            >
              <Icon variant="ENTER" />
              <span>
                {props.is_web_mode
                  ? props.translations.initialize_chat
                  : props.translations.send_request}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
