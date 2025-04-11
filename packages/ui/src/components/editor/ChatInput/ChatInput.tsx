import { useRef, useEffect, useMemo, useState } from 'react'
import styles from './ChatInput.module.scss'
import TextareaAutosize from 'react-textarea-autosize'
import cn from 'classnames'

type Props = {
  value: string
  chat_history: string[]
  chat_history_fim_mode: string[]
  on_change: (value: string) => void
  on_submit: () => void
  on_copy: () => void
  token_count?: number
  is_connected: boolean
  submit_disabled_title?: string
  is_fim_mode: boolean
  on_fim_mode_click: () => void
  has_active_editor: boolean
  has_active_selection: boolean
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

  const get_highlighted_text = (text: string) => {
    if (props.is_fim_mode) {
      return <span>{text}</span>
    }

    const parts = text.split(/(@selection)/g)
    return parts.map((part, index) => {
      if (part == '@selection') {
        return (
          <span
            key={index}
            className={cn(styles['selection-keyword'], {
              [styles['selection-keyword--error']]: !props.has_active_selection
            })}
            title={
              !props.has_active_selection
                ? 'No active selection in editor'
                : undefined
            }
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  useEffect(() => {
    if (textarea_ref.current) {
      textarea_ref.current.focus()
      textarea_ref.current.select()
    }
  }, [])

  const handle_input_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const new_value = e.target.value
    props.on_change(new_value)

    // Reset history navigation state
    set_history_index(-1)

    if (!new_value) {
      set_is_history_enabled(true)
    }
  }

  const handle_submit = () => {
    if (!props.is_connected || (!props.is_fim_mode && !props.value)) return
    props.on_submit()
    set_history_index(-1) // Reset history index after submitting
  }

  const handle_copy = () => {
    if (!props.is_fim_mode && !props.value) return
    props.on_copy()
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key == 'Enter' && e.shiftKey) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // Create new value with newline inserted at cursor position
      const new_value =
        props.value.substring(0, start) + '\n' + props.value.substring(end)

      props.on_change(new_value)

      // Disable history when editing
      set_is_history_enabled(false)

      // Set cursor position after the inserted newline
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    } else if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_submit()
    } else if (
      (e.key == 'ArrowUp' || e.key == 'ArrowDown') &&
      is_history_enabled
    ) {
      // Get active history based on current mode
      const active_history = props.is_fim_mode
        ? props.chat_history_fim_mode
        : props.chat_history

      // Only handle history if there are items
      if (active_history.length == 0) return

      e.preventDefault()

      if (e.key == 'ArrowUp') {
        // Going up in history (show older entries)
        if (history_index < active_history.length - 1) {
          const new_index = history_index + 1
          set_history_index(new_index)
          // Changed to use direct indexing starting from oldest (index 0)
          props.on_change(active_history[new_index])
        }
      } else if (e.key == 'ArrowDown') {
        // Going down in history (show newer entries)
        if (history_index > 0) {
          const new_index = history_index - 1
          set_history_index(new_index)
          // Changed to use direct indexing
          props.on_change(active_history[new_index])
        } else if (history_index === 0) {
          // Return to empty field when reaching the bottom
          set_history_index(-1)
          props.on_change('')
        }
      }
    } else if (props.value) {
      // Only disable history when there's content and pressing other keys
      set_is_history_enabled(false)
    }
  }

  const handle_focus = () => {
    if (textarea_ref.current) {
      textarea_ref.current.select()
    }
  }

  const handle_container_click = () => {
    textarea_ref.current?.focus()
  }

  const insert_selection_placeholder = () => {
    if (!textarea_ref.current) return

    const start = textarea_ref.current.selectionStart
    const end = textarea_ref.current.selectionEnd

    const new_value =
      props.value.substring(0, start) +
      '@selection ' +
      props.value.substring(end)

    props.on_change(new_value)

    // Disable history when inserting selection placeholder
    set_is_history_enabled(false)

    setTimeout(() => {
      if (textarea_ref.current) {
        textarea_ref.current.selectionStart =
          textarea_ref.current.selectionEnd = start + '@selection '.length
      }
    }, 0)
  }

  const can_insert_selection_placeholder = useMemo(() => {
    if (
      !props.has_active_selection ||
      props.value.includes('@selection') ||
      props.is_fim_mode
    ) {
      return false
    } else {
      return true
    }
  }, [props.has_active_selection, props.value, props.is_fim_mode])

  const placeholder = useMemo(() => {
    const active_history = props.is_fim_mode
      ? props.chat_history_fim_mode
      : props.chat_history

    if (props.is_fim_mode && props.has_active_editor) {
      if (active_history.length > 0 && is_history_enabled) {
        return 'Enter optional suggestions (⇅ for history)'
      } else {
        return 'Enter optional suggestions'
      }
    }

    return active_history.length > 0 && is_history_enabled
      ? 'Ask anything (⇅ for history)'
      : 'Ask anything'
  }, [
    props.is_fim_mode,
    props.has_active_editor,
    props.chat_history,
    props.chat_history_fim_mode,
    is_history_enabled
  ])

  return (
    <div
      className={styles.container}
      onClick={handle_container_click}
      ref={container_ref}
    >
      <div className={styles['highlight-container']} ref={highlight_ref}>
        {get_highlighted_text(props.value)}
      </div>
      <TextareaAutosize
        ref={textarea_ref}
        placeholder={placeholder}
        value={props.value}
        onChange={handle_input_change}
        onKeyDown={handle_key_down}
        onFocus={handle_focus}
        autoFocus
        className={styles.textarea}
        minRows={2}
      />
      <div className={styles.footer}>
        <div className={styles.footer__left}>
          {!props.has_active_selection && (
            <button
              onClick={props.on_fim_mode_click}
              className={cn(
                styles.footer__left__button,
                styles['footer__left__button--fim'],
                {
                  [styles['footer__left__button--active']]:
                    props.is_fim_mode && props.has_active_editor,
                  [styles['footer__left__button--disabled']]:
                    !props.has_active_editor
                }
              )}
              title={
                props.has_active_editor
                  ? 'Generate code at cursor position'
                  : 'Open any file to generate code at cursor position'
              }
              disabled={!props.has_active_editor}
            >
              <div className={cn('codicon', 'codicon-insert')} />
              Ask for code completion
            </button>
          )}
          {can_insert_selection_placeholder && (
            <button
              onClick={insert_selection_placeholder}
              className={cn(
                styles.footer__left__button,
                styles['footer__left__button--selection']
              )}
              title="Insert @selection placeholder"
            >
              <span>@selection</span>
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
          <button
            className={styles.footer__right__button}
            onClick={handle_copy}
            title="Copy to clipboard"
            disabled={!props.is_fim_mode && !props.value}
          >
            <div className={cn('codicon', 'codicon-copy')} />
          </button>
          <button
            className={styles.footer__right__button}
            onClick={handle_submit}
            disabled={
              !props.is_connected || (!props.is_fim_mode && !props.value)
            }
            title={props.submit_disabled_title || 'Send'}
          >
            <div className={cn('codicon', 'codicon-send')} />
          </button>
        </div>
      </div>
    </div>
  )
}
