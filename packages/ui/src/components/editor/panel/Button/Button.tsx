import { FC, useEffect, useRef } from 'react'
import styles from './Button.module.scss'
import cn from 'classnames'

type Props = {
  on_click: () => void
  disabled?: boolean
  children?: React.ReactNode
  codicon?: string
  title?: string
  is_secondary?: boolean
  is_focused?: boolean
  is_small?: boolean
}

export const Button: FC<Props> = (props) => {
  const button_ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (props.is_focused) {
      button_ref.current?.focus()
    }
  }, [props.is_focused])

  return (
    <button
      ref={button_ref}
      className={cn(styles.button, {
        [styles['button--secondary']]: props.is_secondary,
        [styles['button--small']]: props.is_small
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
