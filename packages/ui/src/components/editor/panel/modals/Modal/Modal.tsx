import { useEffect, useState } from 'react'
import cn from 'classnames'
import { Scrollable } from '../../Scrollable'
import styles from './Modal.module.scss'

export type ModalIconType = 'success' | 'warning' | 'error'

type Props = {
  title?: string
  icon?: ModalIconType
  content_slot?: React.ReactNode
  footer_slot?: React.ReactNode
  content_max_height?: string
  use_full_width?: boolean
  on_background_click?: () => void
  show_elapsed_time?: boolean
}

export const Modal: React.FC<Props> = (props) => {
  const [elapsed_time, set_elapsed_time] = useState(0)

  const handle_background_click = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target == e.currentTarget) {
      props.on_background_click?.()
    }
  }

  useEffect(() => {
    let elapsed_time_timer: NodeJS.Timeout | undefined

    if (props.show_elapsed_time) {
      set_elapsed_time(0)
      const start_time = Date.now()
      elapsed_time_timer = setInterval(() => {
        set_elapsed_time((Date.now() - start_time) / 1000)
      }, 100)
    }

    return () => {
      if (elapsed_time_timer) clearInterval(elapsed_time_timer)
    }
  }, [props.show_elapsed_time])

  return (
    <div className={styles.overlay} onClick={handle_background_click}>
      <div
        className={cn(styles.container, {
          [styles['container--full-width']]: props.use_full_width
        })}
      >
        {props.icon && (
          <div
            className={cn(styles.icon, 'codicon', {
              'codicon-check': props.icon == 'success',
              'codicon-warning': props.icon == 'warning',
              'codicon-error': props.icon == 'error',
              [styles['icon--success']]: props.icon == 'success',
              [styles['icon--warning']]: props.icon == 'warning',
              [styles['icon--error']]: props.icon == 'error'
            })}
          />
        )}

        {props.title && (
          <div
            className={cn(styles.title, {
              [styles['title--with-icon']]: !!props.icon
            })}
          >
            {props.title}
          </div>
        )}

        {props.show_elapsed_time && (
          <div className={styles['elapsed-time']}>
            {elapsed_time.toFixed(1)}s
          </div>
        )}

        {props.content_slot &&
          (props.content_max_height ? (
            <div className={styles.scrollable}>
              <Scrollable max_height={props.content_max_height}>
                <div className={styles.scrollable__inner}>
                  {props.content_slot}
                </div>
              </Scrollable>
            </div>
          ) : (
            <div className={styles.content}>{props.content_slot}</div>
          ))}

        {props.footer_slot && (
          <div className={styles.footer}>{props.footer_slot}</div>
        )}
      </div>
    </div>
  )
}
