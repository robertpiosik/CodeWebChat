import { useEffect, useState, useRef } from 'react'
import styles from './AutoClosingModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal } from '../Modal'

type Props = {
  title: string
  duration: number
  on_close: () => void
  non_dismissable?: boolean
}

export const AutoClosingModal: React.FC<Props> = (props) => {
  const [is_filling, set_is_filling] = useState(false)
  const on_close_ref = useRef(props.on_close)

  useEffect(() => {
    on_close_ref.current = props.on_close
  }, [props.on_close])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      set_is_filling(true)
    })

    const timeout = setTimeout(() => {
      on_close_ref.current()
    }, props.duration)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timeout)
    }
  }, [props.duration])

  return (
    <div
      onKeyDown={(e) => {
        if (e.key == 'Escape' && !props.non_dismissable) {
          e.stopPropagation()
          props.on_close()
        }
      }}
    >
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
        on_background_click={
          !props.non_dismissable ? props.on_close : undefined
        }
        footer_slot={
          !props.non_dismissable ? (
            <Button on_click={props.on_close} is_focused={true}>
              Close
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
