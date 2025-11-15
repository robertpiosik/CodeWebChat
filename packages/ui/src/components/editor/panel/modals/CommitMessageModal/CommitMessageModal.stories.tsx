import { useState } from 'react'
import { CommitMessageModal } from './CommitMessageModal'

export default {
  component: CommitMessageModal
}

export const Default = () => {
  const [visible, set_visible] = useState(true)

  const handle_accept = (message: string) => {
    alert(`Accepted: ${message}`)
    set_visible(false)
  }

  const handle_cancel = () => {
    set_visible(false)
  }

  return visible ? (
    <CommitMessageModal
      commit_message="feat: Implement amazing new feature"
      auto_accept_after_seconds={5}
      on_accept={handle_accept}
      on_cancel={handle_cancel}
    />
  ) : null
}
