import { FC } from 'react'
import styles from './PromptTypeButton.module.scss'
import cn from 'classnames'

export namespace PromptTypeButton {
  export type Props = {
    label: string
    icon: string
    is_compact?: boolean
    is_active?: boolean
    keycap_char?: string
    on_click?: () => void
  }
}

export const PromptTypeButton: FC<PromptTypeButton.Props> = (props) => {
  return (
    <button
      className={cn(styles.button, {
        [styles['button--active']]: props.is_active,
        [styles['button--compact']]: props.is_compact
      })}
      onClick={props.on_click}
      type="button"
      title={props.is_compact ? props.label : undefined}
    >
      <span
        className={cn('codicon', `codicon-${props.icon}`, styles.button__icon)}
      />
      <span className={styles.button__label}>{props.label}</span>
      {props.keycap_char && (
        <span className={styles.button__keycap}>{props.keycap_char}</span>
      )}
    </button>
  )
}
