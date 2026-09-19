import { useEffect, useState } from 'react'

export const use_browser_connection_status = (is_connected: boolean) => {
  const [is_closed, set_is_closed] = useState(false)
  const [has_been_closed, set_has_been_closed] = useState(false)

  useEffect(() => {
    if (!is_connected) {
      set_is_closed(false)
    }
  }, [is_connected])

  useEffect(() => {
    if (is_connected && !is_closed && has_been_closed) {
      const timer = setTimeout(() => {
        set_is_closed(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [is_connected, is_closed, has_been_closed])

  const handle_close = () => {
    set_is_closed(true)
    set_has_been_closed(true)
  }

  return {
    is_closed,
    handle_close
  }
}
