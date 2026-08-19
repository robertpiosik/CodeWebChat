import React from 'react'
import cn from 'classnames'
import styles from './Textarea.module.scss'
import {
  get_caret_position_from_div,
  set_caret_position_for_div
} from '../prompts/shared/symbols'

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
    const [undo_stack, set_undo_stack] = React.useState<
      { value: string; caret_pos: number }[]
    >([])
    const [redo_stack, set_redo_stack] = React.useState<
      { value: string; caret_pos: number }[]
    >([])
    const caret_pos_ref = React.useRef(0)

    React.useEffect(() => {
      const on_selection_change = () => {
        if (
          document.activeElement === internal_ref.current &&
          internal_ref.current
        ) {
          caret_pos_ref.current = get_caret_position_from_div(
            internal_ref.current
          )
        }
      }
      document.addEventListener('selectionchange', on_selection_change)
      return () =>
        document.removeEventListener('selectionchange', on_selection_change)
    }, [])

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

    const update_value = (new_value: string) => {
      if (new_value === props.value) return
      set_undo_stack((prev) => [
        ...prev,
        { value: props.value || '', caret_pos: caret_pos_ref.current }
      ])
      set_redo_stack([])
      props.on_change(new_value)
    }

    const handle_input = (e: React.FormEvent<HTMLDivElement>) => {
      update_value(e.currentTarget.textContent || '')
    }

    const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() == 'z'
      ) {
        e.preventDefault()
        if (undo_stack.length > 0) {
          const prev_entry = undo_stack[undo_stack.length - 1]
          set_undo_stack((prev) => prev.slice(0, -1))
          set_redo_stack((prev) => [
            ...prev,
            { value: props.value || '', caret_pos: caret_pos_ref.current }
          ])
          props.on_change(prev_entry.value)
          setTimeout(() => {
            if (internal_ref.current) {
              set_caret_position_for_div(
                internal_ref.current,
                prev_entry.caret_pos
              )
            }
          }, 0)
        }
        return
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() == 'z')
      ) {
        e.preventDefault()
        if (redo_stack.length > 0) {
          const next_entry = redo_stack[redo_stack.length - 1]
          set_redo_stack((prev) => prev.slice(0, -1))
          set_undo_stack((prev) => [
            ...prev,
            { value: props.value || '', caret_pos: caret_pos_ref.current }
          ])
          props.on_change(next_entry.value)
          setTimeout(() => {
            if (internal_ref.current) {
              set_caret_position_for_div(
                internal_ref.current,
                next_entry.caret_pos
              )
            }
          }, 0)
        }
        return
      }

      if (
        (e.key == 'Escape' ||
          (e.key == 'Enter' && (props.blur_on_enter ?? true))) &&
        !e.shiftKey
      ) {
        e.preventDefault()
        e.currentTarget.blur()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          range.deleteContents()
          const text_node = document.createTextNode('\n')
          range.insertNode(text_node)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
          update_value(e.currentTarget.textContent || '')
        }
      }
      props.on_key_down?.(e)
    }

    const handle_paste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const text_node = document.createTextNode(text)
        range.insertNode(text_node)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
        update_value(e.currentTarget.textContent || '')
      }
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
            className={cn(
              styles.action,
              'codicon',
              `codicon-${props.action_icon}`
            )}
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
