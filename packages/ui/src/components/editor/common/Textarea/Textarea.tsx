import React from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import styles from './Textarea.module.scss'

type Props = {
  id?: string
  value?: string
  placeholder?: string
  min_rows?: number
  max_rows?: number
  on_change: (value: string) => void
  on_blur?: () => void
  on_key_down?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  (props, ref) => {
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
        ref={ref}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
