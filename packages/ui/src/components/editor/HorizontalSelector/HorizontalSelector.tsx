import styles from './HorizontalSelector.module.scss'
import cn from 'classnames'

export namespace HorizontalSelector {
  export type Option<T extends string> = {
    value: T
    label: string
    title?: string
  }

  export type Props<T extends string> = {
    heading: string
    options: Option<T>[]
    selected_value?: T
    on_select: (value: T) => void
    is_disabled?: boolean
    disabled_state_title?: string
  }
}

export const HorizontalSelector = <T extends string>(
  props: HorizontalSelector.Props<T>
) => {
  return (
    <div
      className={styles.container}
      title={props.is_disabled ? props.disabled_state_title : undefined}
    >
      <div
        className={cn(styles.inner, {
          [styles['inner--disabled']]: props.is_disabled
        })}
      >
        <div className={styles.heading}>{props.heading}</div>
        <div className={styles.options}>
          {props.options.map((option) => (
            <button
              key={option.value}
              className={cn(styles.options__option, {
                [styles['options__option--selected']]:
                  option.value == props.selected_value
              })}
              onClick={() => props.on_select(option.value)}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
