import { useEffect, useState } from 'react'
import styles from './AutoClosingWithActionsModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal, ModalIconType } from '../Modal'

type Props = {
  title: string
  duration: number
  type: ModalIconType
  action_label: string
  on_action: () => void
  on_close: () => void
}

export const AutoClosingWithActionsModal: React.FC<Props> = (props) => {
  const [is_filling, set_is_filling] = useState(false)

  useEffect(() => {
    set_is_filling(true)
    const timeout = setTimeout(() => {
      props.on_action()
    }, props.duration)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div
      onKeyDown={(e) => {
        if (e.key == 'Escape') {
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
        on_background_click={props.on_close}
        footer_slot={
          <>
            <Button on_click={props.on_close} is_secondary={true}>
              Close
            </Button>
            <Button on_click={props.on_action} is_focused={true}>
              {props.action_label}
            </Button>
          </>
        }
      />
    </div>
  )
}
