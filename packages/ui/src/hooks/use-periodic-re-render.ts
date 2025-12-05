import { useState, useEffect } from 'react'

export function use_periodic_re_render(ms: number) {
  const [, set_now] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      set_now(Date.now())
    }, ms)

    return () => {
      clearInterval(interval)
    }
  }, [ms])
}
