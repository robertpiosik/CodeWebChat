import { useState } from 'react'
import styles from './CommitMessageModal.module.scss'
import { Button } from '../Button'
import { Modal } from '../Modal'

type Props = {
  title: string
  commit_message: string
  on_accept: (message: string) => void
  on_cancel: () => void
}

export const CommitMessageModal: React.FC<Props> = (props) => {
  const [message, set_message] = useState(props.commit_message)

  const handle_accept = () => {
    if (message.trim()) {
      props.on_accept(message)
    }
  }

  return (
    <Modal>
      <div className={styles.container}>
        <div className={styles.title}>{props.title}</div>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={(e) => set_message(e.target.value)}
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key == 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handle_accept()
            }
          }}
        />
        <div className={styles.actions}>
          <Button on_click={props.on_cancel}>Cancel</Button>
          <Button on_click={handle_accept} disabled={!message.trim()}>
            Accept
          </Button>
        </div>
      </div>
    </Modal>
  )
}
