import { useState, useEffect, useRef, useLayoutEffect } from 'react'

export const use_compacting = () => {
  const container_ref = useRef<HTMLDivElement>(null)
  const [compact_step, set_compact_step] = useState(0)
  const [thresholds, set_thresholds] = useState<Record<number, number>>({})

  useLayoutEffect(() => {
    if (!container_ref.current) return
    const container = container_ref.current

    const original_width = container.style.width
    const original_max_width = container.style.maxWidth
    const original_flex_shrink = container.style.flexShrink
    const original_transition = container.style.transition

    container.style.transition = 'none'
    container.style.width = 'max-content'
    container.style.maxWidth = 'none'
    container.style.flexShrink = '0'

    const width = container.getBoundingClientRect().width

    container.style.width = original_width
    container.style.maxWidth = original_max_width
    container.style.flexShrink = original_flex_shrink
    container.style.transition = original_transition

    set_thresholds((prev) => {
      const threshold = Math.ceil(width)
      if (prev[compact_step] == threshold) return prev
      return { ...prev, [compact_step]: threshold }
    })
  }, [compact_step])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const container = entries[0].target as HTMLElement
      const width = container.getBoundingClientRect().width

      for (let i = 0; i < compact_step; i++) {
        if (thresholds[i] !== undefined && width >= thresholds[i]) {
          set_compact_step(i)
          return
        }
      }

      if (thresholds[0] !== undefined && width < thresholds[0]) {
        if (compact_step == 0) {
          set_compact_step(1)
        } else {
          if (
            thresholds[compact_step] !== undefined &&
            width < thresholds[compact_step]
          ) {
            if (thresholds[compact_step] < thresholds[compact_step - 1]) {
              set_compact_step(compact_step + 1)
            }
          }
        }
      }
    })

    if (container_ref.current) observer.observe(container_ref.current)
    return () => observer.disconnect()
  }, [thresholds, compact_step])

  return {
    container_ref,
    compact_step
  }
}
