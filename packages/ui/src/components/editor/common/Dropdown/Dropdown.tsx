import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import cn from 'classnames'
import { DropdownMenu } from '../DropdownMenu'
import styles from './Dropdown.module.scss'

export namespace Dropdown {
  export type Option<T extends string> = {
    value: T
    label: string
  }

  export type Props<T extends string> = {
    options: Option<T>[]
    value: T
    onChange: (value: T) => void
  }
}

export const Dropdown = <T extends string>(props: Dropdown.Props<T>) => {
  const [is_open, set_is_open] = useState(false)
  const dropdown_ref = useRef<HTMLDivElement>(null)
  const button_ref = useRef<HTMLButtonElement>(null)
  const [width, set_width] = useState<number>()

  const longest_label = useMemo(
    () =>
      props.options.reduce(
        (longest, option) =>
          option.label.length > longest.length ? option.label : longest,
        ''
      ),
    [props.options]
  )

  useLayoutEffect(() => {
    if (button_ref.current && longest_label) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (context) {
        const button_style = window.getComputedStyle(button_ref.current)
        context.font = button_style.font
        const text_width = context.measureText(longest_label).width
        set_width(text_width + 40)
      }
    }
  }, [longest_label])

  const selected_option = props.options.find((opt) => opt.value == props.value)

  const handle_click_outside = (event: MouseEvent) => {
    if (
      dropdown_ref.current &&
      !dropdown_ref.current.contains(event.target as Node)
    ) {
      set_is_open(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handle_click_outside)
    return () => {
      document.removeEventListener('mousedown', handle_click_outside)
    }
  }, [])

  const menu_items: DropdownMenu.Item[] = props.options.map((option) => ({
    label: option.label,
    is_selected: option.value == props.value,
    on_click: () => {
      props.onChange(option.value)
      set_is_open(false)
    }
  }))

  const style = width ? { width: `${width}px` } : undefined

  return (
    <div className={styles.dropdown} ref={dropdown_ref} style={style}>
      <button
        ref={button_ref}
        className={cn(styles.button, { [styles['button--open']]: is_open })}
        onClick={() => set_is_open(!is_open)}
      >
        <span>{selected_option?.label ?? 'Select...'}</span>
        <span
          className={cn('codicon codicon-chevron-down', [
            styles.chevron,
            { [styles['chevron--open']]: is_open }
          ])}
        />
      </button>
      {is_open && <DropdownMenu items={menu_items} />}
    </div>
  )
}
