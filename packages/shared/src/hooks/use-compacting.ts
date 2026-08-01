import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

export const use_compacting = (max_compact_step = 4) => {
  const container_ref = useRef<HTMLDivElement>(null)
  const [compact_step, set_compact_step] = useState(0)
  const [thresholds, set_thresholds] = useState<Record<number, number>>({})

  const report_width = useCallback((width: number, step: number) => {
    set_thresholds((prev) => {
      // Round up and add 1px buffer to account for subpixel rendering differences
      const threshold = Math.ceil(width) + 1
      if (prev[step] == threshold) return prev
      return { ...prev, [step]: threshold }
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

export const use_compact_order = (labels: string[]) => {
  return useMemo(() => {
    const sorted = labels
      .map((label, index) => ({ length: label.length, index }))
      .sort((a, b) => {
        if (a.length === b.length) return a.index - b.index
        return a.length - b.length
      })

    const steps = new Array(labels.length).fill(0)
    sorted.forEach((item, index) => {
      steps[item.index] = index + 1
    })
    return steps
  }, [labels.join('\0')])
}
