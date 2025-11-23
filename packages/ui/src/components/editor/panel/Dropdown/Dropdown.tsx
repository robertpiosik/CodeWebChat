import { useState, useRef, useEffect } from 'react'
import styles from './Dropdown.module.scss'
import cn from 'classnames'
import { DropdownMenu } from '../../common/DropdownMenu'

export namespace Dropdown {
  export type Option<T extends string> = {
    value: T
    label: string
    shortcut?: string
  }

  export type Props<T extends string> = {
    options: Option<T>[]
    selected_value: T
    on_change: (value: T) => void
    max_width?: number
    menu_max_width?: number | string
    info?: string
    title?: string
  }
}

export const Dropdown = <T extends string>(props: Dropdown.Props<T>) => {
  const [is_open, set_is_open] = useState(false)
  const [just_opened, set_just_opened] = useState(false)
  const container_ref = useRef<HTMLDivElement>(null)
  const opened_by_shortcut = useRef(false)

  const selected_option = props.options.find(
    (option) => option.value == props.selected_value
  )

  const handle_toggle = () => {
    opened_by_shortcut.current = false
    set_is_open(!is_open)
    set_just_opened(!is_open)
  }

  const handle_select = (value: T) => {
    props.on_change(value)
    opened_by_shortcut.current = false
    set_is_open(false)
    set_just_opened(false)
  }

  const handle_wheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const current_index = props.options.findIndex(
      (option) => option.value === props.selected_value
    )
    if (current_index == -1) {
      return
    }

    const options_count = props.options.length
    if (options_count <= 1) return

    let next_index
    if (event.deltaY < 0) {
      next_index = (current_index - 1 + options_count) % options_count
    } else {
      next_index = (current_index + 1) % options_count
    }
    props.on_change(props.options[next_index].value)
  }

  const handle_mouse_leave = () => {
    opened_by_shortcut.current = false
    set_is_open(false)
    set_just_opened(false)
  }

  useEffect(() => {
    const handle_click_outside = (event: MouseEvent) => {
      if (
        container_ref.current &&
        !container_ref.current.contains(event.target as Node)
      ) {
        opened_by_shortcut.current = false
        set_is_open(false)
        set_just_opened(false)
      }
    }

    document.addEventListener('mousedown', handle_click_outside)
    return () => {
      document.removeEventListener('mousedown', handle_click_outside)
    }
  }, [])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && !is_open) {
        event.preventDefault()
        set_is_open(true)
        set_just_opened(true)
        opened_by_shortcut.current = true
      }
    }

    const handle_key_up = (event: KeyboardEvent) => {
      if (
        opened_by_shortcut.current &&
        (event.key == 'Alt' || event.key == 'Shift')
      ) {
        set_is_open(false)
        set_just_opened(false)
        opened_by_shortcut.current = false
      }
    }

    document.addEventListener('keydown', handle_key_down)
    document.addEventListener('keyup', handle_key_up)

    return () => {
      document.removeEventListener('keydown', handle_key_down)
      document.removeEventListener('keyup', handle_key_up)
    }
  }, [is_open])

  return (
    <div
      className={cn(styles.container, { [styles['button--open']]: is_open })}
      ref={container_ref}
      onWheel={handle_wheel}
      onMouseLeave={handle_mouse_leave}
    >
      <button
        className={cn(styles.button, { [styles['button--open']]: is_open })}
        onClick={handle_toggle}
        style={{ maxWidth: props.max_width }}
        title={props.title}
      >
        <span className={styles.button__label}>
          {selected_option ? selected_option.label : 'Select an option'}
        </span>
        {props.info && (
          <span className={styles.button__info}>{props.info}</span>
        )}
        {is_open ? (
          <span
            className={cn('codicon', 'codicon-chevron-up', styles.button__icon)}
          />
        ) : (
          <span
            className={cn(
              'codicon',
              'codicon-chevron-down',
              styles.button__icon
            )}
          />
        )}
      </button>

      {is_open && (
        <DropdownMenu
          items={props.options.map((option) => ({
            label: option.label,
            on_click: () => handle_select(option.value),
            is_selected: just_opened && option.value == props.selected_value,
            shortcut: option.shortcut,
          }))}
          underline_non_selected_items={opened_by_shortcut.current}
          max_width={props.menu_max_width}
        />
      )}
    </div>
  )
}
