import { FC } from 'react'
import styles from './Button.module.scss'

type Props = {
  on_click: () => void
  disabled?: boolean
  children?: React.ReactNode
}

export const Button: FC<Props> = (props) => {
  return (
    <button
      className={styles.button}
      onClick={props.on_click}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
