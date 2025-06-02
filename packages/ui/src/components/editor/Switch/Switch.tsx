import React, { useRef, useEffect, useState } from 'react'
import styles from './Switch.module.scss'
import cn from 'classnames'

type SwitchProps<T extends string> = {
  value: T
  on_change: (value: T) => void
  options: T[]
}

export const Switch = <T extends string>({
  value,
  on_change,
  options
}: SwitchProps<T>) => {
  const container_ref = useRef<HTMLDivElement>(null)
  const [pill_style, set_pill_style] = useState<React.CSSProperties>({})
  const [delayed_active_value, set_delayed_active_value] = useState(value)

  useEffect(() => {
    if (container_ref.current) {
      const active_index = options.indexOf(value)
      const option_elements = container_ref.current.querySelectorAll(
        `.${styles.option}`
      )

      if (option_elements[active_index]) {
        const current_option_element = option_elements[
          active_index
        ] as HTMLElement
        set_pill_style({
          left: current_option_element.offsetLeft,
          width: current_option_element.offsetWidth,
          height: current_option_element.offsetHeight
        })
      }
    }
  }, [value, options])

  useEffect(() => {
    const timeout_handler = setTimeout(() => {
      set_delayed_active_value(value)
    }, 70)

    return () => clearTimeout(timeout_handler)
  }, [value])

  return (
    <div className={styles.container} ref={container_ref}>
      <div className={styles.pill} style={pill_style} />
      {options.map((option) => (
        <div
          key={option}
          className={cn(styles.option, {
            [styles['option--active']]: delayed_active_value === option,
            [styles['option--active-immediate']]: value === option
          })}
          onClick={() => on_change(option)}
          data-text={option}
        >
          {option}
        </div>
      ))}
    </div>
  )
}
