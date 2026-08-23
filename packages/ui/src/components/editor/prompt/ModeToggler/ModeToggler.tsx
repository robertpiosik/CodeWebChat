import { FC, useCallback, useState } from 'react'
import styles from './ModeToggler.module.scss'
import cn from 'classnames'

type Props = {
  mode: string
  alt_mode: string
  title?: string
  is_alt_pressed?: boolean
  on_toggle?: () => void
}

export const ModeToggler: FC<Props> = (props) => {
  const [is_hovered, set_is_hovered] = useState(false)
  const [just_clicked, set_just_clicked] = useState(false)

  const handle_mouse_enter = useCallback(() => {
    set_is_hovered(true)
    set_just_clicked(false)
  }, [])

  const handle_mouse_leave = useCallback(() => {
    set_is_hovered(false)
    set_just_clicked(false)
  }, [])

  const handle_click = useCallback(() => {
    set_just_clicked(true)
    props.on_toggle?.()
  }, [props.on_toggle])

  return (
    <button
      className={styles.toggler}
      onClick={handle_click}
      onMouseEnter={handle_mouse_enter}
      onMouseLeave={handle_mouse_leave}
      title={props.title}
      type="button"
    >
      <div
        className={cn(styles.toggler__wrapper, {
          [styles['toggler__wrapper--hover']]: is_hovered && !just_clicked,
          [styles['toggler__wrapper--no-transition']]: just_clicked
        })}
      >
        <span className={styles.toggler__label}>{props.mode}</span>
        <span className={styles.toggler__label}>{props.alt_mode}</span>
      </div>
      {props.is_alt_pressed && <span className={styles.toggler__esc}>esc</span>}
    </button>
  )
}
