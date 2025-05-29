import { FC } from 'react'
import styles from './SmallButton.module.scss'
import cn from 'classnames'

type Props = {
  on_click: () => void
  disabled?: boolean
  children?: React.ReactNode
  variant?: 'primary' | 'secondary'
  title?: string
}

export const SmallButton: FC<Props> = ({ variant = 'primary', ...props }) => {
  return (
    <button
      className={cn(styles.button, styles[`button--${variant}`])}
      onClick={props.on_click}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  )
}
