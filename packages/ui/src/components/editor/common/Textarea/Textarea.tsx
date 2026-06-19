import React from 'react'
import cn from 'classnames'
import styles from './Textarea.module.scss'

type Props = {
  id?: string
  value?: string
  placeholder?: string
  autofocus?: boolean
  min_rows?: number
  max_rows?: number
  blur_on_enter?: boolean
  on_change: (value: string) => void
  on_blur?: () => void
  on_key_down?: (e: React.KeyboardEvent<HTMLDivElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void
  action_icon?: string
  action_title?: string
  on_action_click?: () => void
}

export const Textarea = React.forwardRef<HTMLDivElement, Props>(
  (props, ref) => {
    const internal_ref = React.useRef<HTMLDivElement | null>(null)

    const set_ref = React.useCallback(
      (node: HTMLDivElement | null) => {
        internal_ref.current = node
        if (typeof ref == 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref]
    )

    React.useEffect(() => {
      if (
        internal_ref.current &&
        internal_ref.current.textContent !== props.value
      ) {
        internal_ref.current.textContent = props.value || ''
      }
    }, [props.value])

    React.useEffect(() => {
      if (props.autofocus && internal_ref.current) {
        internal_ref.current.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(internal_ref.current)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }, [props.autofocus])

    const handle_input = (e: React.FormEvent<HTMLDivElement>) => {
      props.on_change(e.currentTarget.textContent || '')
    }

    const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        (e.key == 'Escape' ||
          (e.key == 'Enter' && (props.blur_on_enter ?? true))) &&
        !e.shiftKey
      ) {
        e.preventDefault()
        e.currentTarget.blur()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        document.execCommand('insertText', false, '\n')
      }
      props.on_key_down?.(e)
    }

    const handle_paste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }

    const handle_focus = (e: React.FocusEvent<HTMLDivElement>) => {
      props.onFocus?.(e)
    }

    const handle_blur = (e: React.FocusEvent<HTMLDivElement>) => {
      props.on_blur?.()
    }

    return (
      <div
        className={styles.wrapper}
        onClick={() => internal_ref.current?.focus()}
        style={{
          maxHeight: props.max_rows
            ? `calc(${props.max_rows * 1.4}em + 10px)`
            : undefined,
          overflowY: props.max_rows ? 'auto' : undefined
        }}
      >
        {props.action_icon && props.on_action_click && (
          <div
            className={cn(styles.action, 'codicon', `codicon-${props.action_icon}`)}
            title={props.action_title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              props.on_action_click?.()
            }}
          />
        )}
        <div
          id={props.id}
          ref={set_ref}
          contentEditable={true}
          suppressContentEditableWarning={true}
          className={cn(styles.textarea, {
            [styles['textarea--empty']]: !props.value
          })}
          onInput={handle_input}
          onKeyDown={handle_key_down}
          onPaste={handle_paste}
          onFocus={handle_focus}
          onBlur={handle_blur}
          data-placeholder={props.placeholder}
          role="textbox"
          aria-multiline="true"
          style={{
            minHeight: props.min_rows ? `${props.min_rows * 1.4}em` : undefined
          }}
        />
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
