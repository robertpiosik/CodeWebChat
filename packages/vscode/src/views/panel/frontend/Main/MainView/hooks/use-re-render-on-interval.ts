import { useEffect, useState } from 'react'

export const use_re_render_on_interval = (interval_ms: number) => {
  const [, set_now] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      set_now(Date.now())
    }, interval_ms)

    return () => {
      clearInterval(interval)
    }
  }, [interval_ms])
}
