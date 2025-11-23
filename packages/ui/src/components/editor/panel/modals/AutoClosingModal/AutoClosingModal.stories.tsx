import { useState } from 'react'
import { AutoClosingModal } from './AutoClosingModal'

export default {
  component: AutoClosingModal
}

export const Default = () => {
  const [visible, set_visible] = useState(true)

  const handle_close = () => {
    set_visible(false)
  }

  return visible ? (
    <AutoClosingModal
      title="Chat has been initialized in the connected browser"
      duration={3000}
      on_close={handle_close}
    />
  ) : null
}
