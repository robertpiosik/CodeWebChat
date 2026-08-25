import { FC } from 'react'
import styles from './IconAccentButton.module.scss'
import cn from 'classnames'

export namespace IconAccentButton {
  export type Props = {
    label: string
    icon: string
    is_compact?: boolean
    is_active?: boolean
    active_color?: 'blue' | 'orange' | 'green' | 'red'
    on_click?: () => void
  }
}

export const IconAccentButton: FC<IconAccentButton.Props> = (props) => {
  return (
    <button
      className={cn(styles.button, {
        [styles['button--active']]: props.is_active,
        [styles['button--compact']]: props.is_compact,
        [styles['button--blue']]:
          props.is_active && props.active_color == 'blue',
        [styles['button--orange']]:
          props.is_active && props.active_color == 'orange',
        [styles['button--green']]:
          props.is_active && props.active_color == 'green',
        [styles['button--red']]: props.is_active && props.active_color == 'red'
      })}
      onClick={props.on_click}
      type="button"
      title={props.is_compact ? props.label : undefined}
    >
      <span
        className={cn('codicon', `codicon-${props.icon}`, styles.button__icon)}
      />
      <span className={styles.button__label}>{props.label}</span>
    </button>
  )
}
