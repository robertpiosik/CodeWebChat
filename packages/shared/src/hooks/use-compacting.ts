import { useState, useEffect, useRef, useCallback } from 'react'

export const use_compacting = (max_compact_step = 4) => {
  const container_ref = useRef<HTMLDivElement>(null)
  const [compact_step, set_compact_step] = useState(0)
  const [thresholds, set_thresholds] = useState<Record<number, number>>({})

  const report_width = useCallback((width: number, step: number) => {
    set_thresholds((prev) => {
      if (prev[step] == width) return prev
      return { ...prev, [step]: width }
    })
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width

      // Try to expand (reduce compaction)
      for (let i = 0; i < compact_step; i++) {
        if (thresholds[i] !== undefined && width >= thresholds[i]) {
          set_compact_step(i)
          return
        }
      }

      // Try to shrink (increase compaction)
      if (thresholds[0] !== undefined && width < thresholds[0]) {
        if (compact_step == 0) {
          set_compact_step(1)
        } else if (compact_step < max_compact_step) {
          if (
            thresholds[compact_step] !== undefined &&
            width < thresholds[compact_step]
          ) {
            set_compact_step(compact_step + 1)
          }
        }
      }
    })

    if (container_ref.current) observer.observe(container_ref.current)
    return () => observer.disconnect()
  }, [thresholds, compact_step, max_compact_step])

  return {
    container_ref,
    compact_step,
    report_width
  }
}
