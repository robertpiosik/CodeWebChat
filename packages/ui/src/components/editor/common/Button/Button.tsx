import { FC, useEffect, useRef } from 'react'
import styles from './Button.module.scss'
import cn from 'classnames'

type Props = {
  on_click?: () => void
  url?: string
  disabled?: boolean
  children?: React.ReactNode
  codicon?: string
  title?: string
  is_secondary?: boolean
  is_danger?: boolean
  is_focused?: boolean
  is_small?: boolean
}

export const Button: FC<Props> = (props) => {
  const button_ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null)

  useEffect(() => {
    if (props.is_focused) {
      button_ref.current?.focus()
    }
  }, [props.is_focused])

  const className = cn(styles.button, {
    [styles['button--secondary']]: props.is_secondary,
    [styles['button--small']]: props.is_small,
    [styles['button--danger']]: props.is_danger
  })

  const children = (
    <>
      {props.codicon && (
        <span className={cn('codicon', `codicon-${props.codicon}`)} />
      )}
      {props.children}
    </>
  )

  if (props.url) {
    return (
      <a
        ref={button_ref as React.RefObject<HTMLAnchorElement>}
        className={className}
        href={props.url}
        onClick={props.on_click}
        title={props.title}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      ref={button_ref as React.RefObject<HTMLButtonElement>}
      className={className}
      onClick={props.on_click}
      disabled={props.disabled}
      title={props.title}
    >
      {children}
    </button>
  )
}
