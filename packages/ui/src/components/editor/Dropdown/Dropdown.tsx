import { useState, useRef, useEffect } from 'react'
import styles from './Dropdown.module.scss'
import cn from 'classnames'

export namespace Dropdown {
  export type Option<T extends string> = {
    value: T
    label: string
  }

  export type Props<T extends string> = {
    options: Option<T>[]
    selected_value: T
    on_change: (value: T) => void
    title?: string
    max_width?: number
  }
}

export const Dropdown = <T extends string>(props: Dropdown.Props<T>) => {
  const [is_open, set_is_open] = useState(false)
  const [just_opened, set_just_opened] = useState(false)
  const container_ref = useRef<HTMLDivElement>(null)

  const selected_option = props.options.find(
    (option) => option.value == props.selected_value
  )

  const handle_toggle = () => {
    if (!is_open) {
      set_just_opened(true)
    }
    set_is_open(!is_open)
  }

  const handle_select = (value: T) => {
    props.on_change(value)
    set_is_open(false)
    set_just_opened(false)
  }

  const handle_mouse_enter = () => {
    set_just_opened(false)
  }

  useEffect(() => {
    const handle_click_outside = (event: MouseEvent) => {
      if (
        container_ref.current &&
        !container_ref.current.contains(event.target as Node)
      ) {
        set_is_open(false)
        set_just_opened(false)
      }
    }

    document.addEventListener('mousedown', handle_click_outside)
    return () => {
      document.removeEventListener('mousedown', handle_click_outside)
    }
  }, [])

  return (
    <div
      className={cn(styles.container, { [styles['button--open']]: is_open })}
      ref={container_ref}
      title={props.title}
    >
      <button
        className={cn(styles.button, { [styles['button--open']]: is_open })}
        onClick={handle_toggle}
        style={{ maxWidth: props.max_width }}
      >
        <span className={styles.button__label}>
          {selected_option ? selected_option.label : 'Select an option'}
        </span>
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
        <div className={styles.menu} onMouseEnter={handle_mouse_enter}>
          {props.options.map((option) => (
            <div
              key={option.value}
              className={cn(styles.menu__item, {
                [styles['menu__item--selected']]:
                  just_opened && option.value == props.selected_value
              })}
              onClick={() => handle_select(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
