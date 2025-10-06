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
      title="Review Commit Message"
      commit_message="feat: Implement amazing new feature"
      on_accept={handle_accept}
      on_cancel={handle_cancel}
    />
  ) : null
}
