import React from 'react'
import styles from './TextButton.module.scss'
import cn from 'classnames'

type Props = {
  children: React.ReactNode
  on_click: () => void
  disabled?: boolean
  title?: string
}

export const TextButton: React.FC<Props> = (props) => {
  return (
    <button
      className={cn(styles.button)}
      onClick={props.on_click}
      disabled={props.disabled}
      title={props.title}
    >
      {props.children}
    </button>
  )
}
