import { useEffect, useState } from 'react'

export const use_progress_times = (items: { id: string }[]) => {
  const [start_times, set_start_times] = useState<Record<string, number>>({})
  const [now, set_now] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      set_now(Date.now())
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    set_start_times((prev) => {
      const next = { ...prev }
      let changed = false
      const current_ids = new Set(items.map((i) => i.id))

      items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = Date.now()
          changed = true
        }
      })

      Object.keys(next).forEach((id) => {
        if (!current_ids.has(id)) {
          delete next[id]
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [items])

  return { start_times, now }
}
