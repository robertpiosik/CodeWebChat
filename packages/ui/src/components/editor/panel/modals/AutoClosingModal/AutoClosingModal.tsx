import { useEffect, useState } from 'react'
import styles from './AutoClosingModal.module.scss'
import { Button } from '../../Button'
import { Modal } from '../Modal'

type Props = {
  title: string
  duration: number
  on_close: () => void
}

export const AutoClosingModal: React.FC<Props> = (props) => {
  const [is_filling, set_is_filling] = useState(false)

  useEffect(() => {
    set_is_filling(true)
    const timeout = setTimeout(() => {
      props.on_close()
    }, props.duration)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Modal
      title={props.title}
      content_slot={
        <div className={styles.progress}>
          <div
            className={styles.progress__fill}
            style={{
              width: is_filling ? '100%' : '0%',
              transition: `width ${props.duration}ms linear`
            }}
          />
        </div>
      }
      on_background_click={props.on_close}
      footer_slot={
        <Button on_click={props.on_close} is_focused={true}>
          Close
        </Button>
      }
    />
  )
}
