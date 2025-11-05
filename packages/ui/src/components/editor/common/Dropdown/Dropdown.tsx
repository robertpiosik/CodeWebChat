import { useState, useRef, useEffect } from 'react'
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
    className?: string
    max_width?: number
  }
}

export const Dropdown = <T extends string>({
  options,
  value,
  onChange,
  className,
  max_width
}: Dropdown.Props<T>) => {
  const [is_open, set_is_open] = useState(false)
  const dropdown_ref = useRef<HTMLDivElement>(null)

  const selected_option = options.find((opt) => opt.value === value)

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

  const menu_items: DropdownMenu.Item[] = options.map((option) => ({
    label: option.label,
    is_selected: option.value === value,
    on_click: () => {
      onChange(option.value)
      set_is_open(false)
    }
  }))

  const style = max_width ? { maxWidth: `${max_width}px` } : undefined

  return (
    <div
      className={cn(styles.dropdown, className)}
      ref={dropdown_ref}
      style={style}
    >
      <button
        className={styles.button}
        onClick={() => set_is_open(!is_open)}
        data-is-open={is_open}
      >
        <span>{selected_option?.label ?? 'Select...'}</span>
        <span
          className={cn(
            'codicon codicon-chevron-down',
            styles.chevron,
            is_open && styles.chevron_open
          )}
        />
      </button>
      {is_open && (
        <DropdownMenu items={menu_items} className={styles.menu_override} />
      )}
    </div>
  )
}
