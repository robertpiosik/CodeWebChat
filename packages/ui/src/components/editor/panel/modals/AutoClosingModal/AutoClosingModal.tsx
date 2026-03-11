import { useEffect, useState } from 'react'
import styles from './AutoClosingModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal, ModalIconType } from '../Modal'

type Props = {
  title: string
  duration: number
  type: ModalIconType
  on_close: () => void
  non_dismissable?: boolean
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
        icon={props.type}
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
