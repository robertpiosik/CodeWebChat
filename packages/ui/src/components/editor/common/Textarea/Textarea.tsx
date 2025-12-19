import React, { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import styles from './Textarea.module.scss'

type Props = {
  id?: string
  value?: string
  placeholder?: string
  autofocus?: boolean
  min_rows?: number
  max_rows?: number
  max_rows_when_collapsed?: number
  on_change: (value: string) => void
  on_blur?: () => void
  on_key_down?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  (props, ref) => {
    const [has_been_focused, set_has_been_focused] = useState(!!props.autofocus)
    const internal_ref = React.useRef<HTMLTextAreaElement | null>(null)

    const set_ref = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internal_ref.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    React.useEffect(() => {
      if (props.autofocus && internal_ref.current) {
        internal_ref.current.focus()
        internal_ref.current.setSelectionRange(
          internal_ref.current.value.length,
          internal_ref.current.value.length
        )
      }
    }, [])

    const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key == 'Enter' && !e.shiftKey) {
        e.preventDefault()
        e.currentTarget.blur()
      }
      props.on_key_down?.(e)
    }

    const handle_focus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      set_has_been_focused(true)
      props.onFocus?.(e)
    }

    const handle_blur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      props.on_blur?.()
    }

    const max_rows = has_been_focused
      ? props.max_rows
      : (props.max_rows_when_collapsed ?? props.max_rows)

    return (
      <TextareaAutosize
        id={props.id}
        value={props.value}
        onChange={(e) => props.on_change(e.target.value)}
        onBlur={handle_blur}
        onKeyDown={handle_key_down}
        className={styles.textarea}
        placeholder={props.placeholder}
        minRows={props.min_rows}
        maxRows={max_rows}
        onFocus={handle_focus}
        ref={set_ref}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
