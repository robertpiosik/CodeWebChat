import cn from 'classnames'
import { Scrollable } from '../../Scrollable'
import styles from './Modal.module.scss'

type Props = {
  title?: string
  content_slot?: React.ReactNode
  footer_slot?: React.ReactNode
  content_max_height?: string
  use_full_width?: boolean
}

export const Modal: React.FC<Props> = (props) => {
  return (
    <div className={styles.overlay}>
      <div
        className={cn(styles.container, {
          [styles['container--full-width']]: props.use_full_width
        })}
      >
        {props.title && <div className={styles.title}>{props.title}</div>}

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
