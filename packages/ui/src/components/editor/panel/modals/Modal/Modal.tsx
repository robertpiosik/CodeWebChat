import { Scrollable } from '../../Scrollable'
import styles from './Modal.module.scss'

type Props = {
  title?: string
  content_slot?: React.ReactNode
  footer_slot?: React.ReactNode
  content_max_height?: string
}

export const Modal: React.FC<Props> = (props) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {props.title && <div className={styles.title}>{props.title}</div>}

        {props.content_slot &&
          (props.content_max_height ? (
            <Scrollable max_height={props.content_max_height}>
              <div className={styles.content}>{props.content_slot}</div>
            </Scrollable>
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
