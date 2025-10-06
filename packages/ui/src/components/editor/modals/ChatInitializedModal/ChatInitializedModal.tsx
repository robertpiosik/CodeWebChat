import { useEffect, useState } from 'react'
import styles from './ChatInitializedModal.module.scss'
import { Button } from '../../Button'
import { Modal } from '../Modal'

type Props = {
  title: string
  duration: number
  on_close: () => void
}

export const ChatInitializedModal: React.FC<Props> = (props) => {
  const [is_filling, set_is_filling] = useState(false)

  useEffect(() => {
    const request_id = requestAnimationFrame(() => {
      set_is_filling(true)
    })

    const close_timeout = setTimeout(() => {
      props.on_close()
    }, props.duration)

    return () => {
      cancelAnimationFrame(request_id)
      clearTimeout(close_timeout)
    }
  }, [props.duration, props.on_close])

  return (
    <Modal>
      <div className={styles.container}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles.progress}>
          <div
            className={styles.progress__fill}
            style={{
              width: is_filling ? '100%' : '0%',
              transition: `width ${props.duration}ms linear`
            }}
          />
        </div>
        <Button on_click={props.on_close} is_focused={true}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
