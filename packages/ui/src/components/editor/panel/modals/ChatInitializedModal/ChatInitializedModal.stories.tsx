import { useState } from 'react'
import { ChatInitializedModal } from './ChatInitializedModal'

export default {
  component: ChatInitializedModal
}

export const Default = () => {
  const [visible, set_visible] = useState(true)

  const handle_close = () => {
    set_visible(false)
  }

  return visible ? (
    <ChatInitializedModal
      title="Chat has been initialized in the connected browser"
      duration={3000}
      on_close={handle_close}
    />
  ) : null
}
