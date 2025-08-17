import { FC } from 'react'
import styles from './Button.module.scss'
import cn from 'classnames'

type Props = {
  on_click: () => void
  disabled?: boolean
  children?: React.ReactNode
  codicon?: string
  title?: string
  is_secondary?: boolean
}

export const Button: FC<Props> = (props) => {
  return (
    <button
      className={cn(styles.button, {
        [styles['button--secondary']]: props.is_secondary
      })}
      onClick={props.on_click}
      disabled={props.disabled}
      title={props.title}
    >
      {props.codicon && (
        <span className={cn('codicon', `codicon-${props.codicon}`)} />
      )}
      {props.children}
    </button>
  )
}
