import { useState } from 'react'
import { AutoClosingWithActionsModal } from './AutoClosingWithActionsModal'

export default {
  component: AutoClosingWithActionsModal
}

export const Default = () => {
  const [visible, set_visible] = useState(true)

  const handle_close = () => {
    set_visible(false)
  }

  return visible ? (
    <AutoClosingWithActionsModal
      title="Found Relevant Files"
      duration={3000}
      on_close={handle_close}
      on_action={handle_close}
      action_label="Edit context"
      type="success"
    />
  ) : null
}
