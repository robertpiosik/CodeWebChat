import { useState, useEffect } from 'react'
import { Progress } from './Progress'

export default {
  component: Progress
}

export const Indeterminate = () => {
  const [visible, set_visible] = useState(true)

  const handleCancel = () => {
    set_visible(false)
  }

  return visible ? (
    <Progress title="Processing…" on_cancel={handleCancel} />
  ) : null
}

export const WithProgress = () => {
  const [visible, set_visible] = useState(true)
  const [progress, set_progress] = useState(0)

  const handle_cancel = () => {
    set_visible(false)
  }

  // Simulate progress increasing every half‑second
  useEffect(() => {
    const timer = setInterval(() => {
      set_progress((prev) => {
        const next = prev + 10
        if (next >= 100) {
          clearInterval(timer)
          return 100
        }
        return next
      })
    }, 500)

    return () => clearInterval(timer)
  }, [])

  return visible ? (
    <Progress
      title="Receiving..."
      progress={progress}
      tokens_per_second={250}
      on_cancel={handle_cancel}
    />
  ) : null
}
