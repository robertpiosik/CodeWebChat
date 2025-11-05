import { useState, useEffect, useRef, useCallback } from 'react'

export const use_commit_timer = (params: {
  on_accept: () => void
  initial_countdown: number
}) => {
  const [countdown, setCountdown] = useState(params.initial_countdown)
  const [is_timer_active, set_is_timer_active] = useState(true)
  const interval_ref = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!is_timer_active) {
      return
    }
    interval_ref.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (interval_ref.current) clearInterval(interval_ref.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (interval_ref.current) clearInterval(interval_ref.current)
    }
  }, [is_timer_active])

  useEffect(() => {
    if (countdown == 0 && is_timer_active) {
      params.on_accept()
    }
  }, [countdown, is_timer_active, params.on_accept])

  const stop_timer = useCallback(() => {
    set_is_timer_active(false)
  }, [])

  return { countdown, is_timer_active, stop_timer }
}
