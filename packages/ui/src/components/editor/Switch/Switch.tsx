import React, { useRef, useEffect, useState } from 'react'
import styles from './Switch.module.scss'
import cn from 'classnames'

type SwitchProps<T extends string> = {
  value: T
  on_change: (value: T) => void
  options: T[]
  title?: string
}

export const Switch = <T extends string>(props: SwitchProps<T>) => {
  const container_ref = useRef<HTMLDivElement>(null)
  const [pill_style, set_pill_style] = useState<React.CSSProperties>({})
  const [delayed_active_value, set_delayed_active_value] = useState(props.value)

  useEffect(() => {
    if (container_ref.current) {
      const active_index = props.options.indexOf(props.value)
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
  }, [props.value])

  useEffect(() => {
    const timeout_handler = setTimeout(() => {
      set_delayed_active_value(props.value)
    }, 70)

    return () => clearTimeout(timeout_handler)
  }, [props.value])

  return (
    <div className={styles.container} ref={container_ref} title={props.title}>
      <div className={styles.pill} style={pill_style} />
      {props.options.map((option) => (
        <div
          key={option}
          className={cn(styles.option, {
            [styles['option--active']]: delayed_active_value == option,
            [styles['option--active-immediate']]: props.value == option
          })}
          onClick={() => props.on_change(option)}
          data-text={option}
        >
          {option}
        </div>
      ))}
    </div>
  )
}
