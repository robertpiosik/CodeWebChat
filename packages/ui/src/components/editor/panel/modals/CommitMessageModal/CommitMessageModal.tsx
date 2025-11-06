import { useState, useCallback } from 'react'
import { Button } from '../../Button'
import { Modal } from '../Modal'
import { Textarea } from '../../../common/Textarea'
import { use_commit_timer } from './hooks/use-commit-timer'

type Props = {
  commit_message: string
  on_accept: (message: string) => void
  on_cancel: () => void
}

export const CommitMessageModal: React.FC<Props> = (props) => {
  const [message, set_message] = useState(props.commit_message)

  const handle_accept = useCallback(() => {
    if (message.trim()) {
      props.on_accept(message)
    }
  }, [message, props.on_accept])

  const commit_timer_hook = use_commit_timer({
    on_accept: handle_accept,
    initial_countdown: 5
  })

  return (
    <div onMouseDown={commit_timer_hook.stop_timer}>
      <Modal
        title="Commit changes"
        content_slot={
          <Textarea
            value={message}
            on_change={set_message}
            min_rows={2}
            on_key_down={(e) => {
              if (e.key == 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handle_accept()
              }
            }}
          />
        }
        footer_slot={
          <>
            <Button on_click={props.on_cancel} is_secondary={true}>
              Cancel
            </Button>
            <Button on_click={handle_accept} disabled={!message.trim()}>
              Commit
              {commit_timer_hook.is_timer_active &&
                commit_timer_hook.countdown > 0 &&
                ` (${commit_timer_hook.countdown})`}
            </Button>
          </>
        }
      />
    </div>
  )
}
