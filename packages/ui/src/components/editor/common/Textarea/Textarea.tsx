import React from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import styles from './Textarea.module.scss'

type Props = {
  id?: string
  value?: string
  placeholder?: string
  autofocus?: boolean
  min_rows?: number
  max_rows?: number
  on_change: (value: string) => void
  on_blur?: () => void
  on_key_down?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  (props, ref) => {
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

    return (
      <TextareaAutosize
        id={props.id}
        value={props.value}
        onChange={(e) => props.on_change(e.target.value)}
        onBlur={props.on_blur}
        onKeyDown={handle_key_down}
        className={styles.textarea}
        placeholder={props.placeholder}
        minRows={props.min_rows}
        maxRows={props.max_rows}
        onFocus={props.onFocus}
        ref={set_ref}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
