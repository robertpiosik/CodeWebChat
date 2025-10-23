import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './CommitMessageModal.module.scss'
import { Button } from '../../Button'
import { Modal } from '../Modal'
import TextareaAutosize from 'react-textarea-autosize'

type Props = {
  commit_message: string
  on_accept: (message: string) => void
  on_cancel: () => void
}

export const CommitMessageModal: React.FC<Props> = (props) => {
  const [message, set_message] = useState(props.commit_message)
  const [countdown, setCountdown] = useState(5)
  const [is_timer_active, set_is_timer_active] = useState(true)
  const interval_ref = useRef<NodeJS.Timeout>()

  const handle_accept = useCallback(() => {
    if (message.trim()) {
      props.on_accept(message)
    }
  }, [message, props.on_accept])

  useEffect(() => {
    if (!is_timer_active) {
      return
    }
    interval_ref.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (interval_ref.current) clearInterval(interval_ref.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (interval_ref.current) clearInterval(interval_ref.current)
    }
  }, [is_timer_active])

  useEffect(() => {
    if (countdown == 0 && is_timer_active) {
      handle_accept()
    }
  }, [countdown, is_timer_active, handle_accept])

  const stop_timer = () => {
    set_is_timer_active(false)
  }

  return (
    <Modal
      title="Commit changes"
      content_slot={
        <TextareaAutosize
          className={styles.textarea}
          value={message}
          onChange={(e) => set_message(e.target.value)}
          minRows={2}
          onKeyDown={(e) => {
            if (e.key == 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handle_accept()
            }
          }}
          onMouseDown={stop_timer}
        />
      }
      footer_slot={
        <div className={styles.actions} onMouseDown={stop_timer}>
          <Button on_click={props.on_cancel} is_secondary={true}>
            Cancel
          </Button>
          <Button
            on_click={handle_accept}
            disabled={!message.trim()}
            is_focused={true}
          >
            Commit
            {is_timer_active && countdown > 0 && ` (${countdown})`}
          </Button>
        </div>
      }
    />
  )
}
