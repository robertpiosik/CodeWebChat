import { useState } from 'react'
import styles from './CommitMessageModal.module.scss'
import { Button } from '../../Button'
import { Modal } from '../Modal'
import TextareaAutosize from 'react-textarea-autosize'
import { dictionary } from '@shared/constants/dictionary'

type Props = {
  commit_message: string
  on_accept: (message: string) => void
  on_cancel: () => void
}

export const CommitMessageModal: React.FC<Props> = (props) => {
  const [message, set_message] = useState(props.commit_message)
  const dict = dictionary['CommitMessageModal.tsx']

  const handle_accept = () => {
    if (message.trim()) {
      props.on_accept(message)
    }
  }

  return (
    <Modal>
      <div className={styles.container}>
        <div className={styles.title}>{dict.commit_changes}</div>
        <TextareaAutosize
          className={styles.textarea}
          value={message}
          onChange={(e) => set_message(e.target.value)}
          minRows={2}
          maxRows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key == 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handle_accept()
            }
          }}
        />
        <div className={styles.actions}>
          <Button on_click={props.on_cancel}>{dict.cancel}</Button>
          <Button on_click={handle_accept} disabled={!message.trim()}>
            {dict.commit}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
