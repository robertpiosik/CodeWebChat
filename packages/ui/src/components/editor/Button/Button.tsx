import { FC } from 'react'
import styles from './Button.module.scss'
import cn from 'classnames'

type Props = {
  on_click: () => void
  disabled?: boolean
  children?: React.ReactNode
  codicon?: string
  title?: string
}

export const Button: FC<Props> = (props) => {
  return (
    <button
      className={styles.button}
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
