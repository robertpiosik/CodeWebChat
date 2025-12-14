import { useState, useLayoutEffect, useEffect, useRef } from 'react'

export const use_compacting = () => {
  const container_ref = useRef<HTMLDivElement>(null)
  const left_ref = useRef<HTMLDivElement>(null)
  const right_ref = useRef<HTMLDivElement>(null)
  const [compact_step, set_compact_step] = useState(0)
  const [thresholds, set_thresholds] = useState<{
    step0: number
    step1: number
    step2: number
  }>({ step0: 0, step1: 0, step2: 0 })

  useLayoutEffect(() => {
    if (left_ref.current && right_ref.current) {
      const width =
        left_ref.current.offsetWidth + right_ref.current.offsetWidth + 6

      if (compact_step == 0)
        set_thresholds((prev) => ({ ...prev, step0: width }))
      else if (compact_step == 1)
        set_thresholds((prev) => ({ ...prev, step1: width }))
      else if (compact_step == 2)
        set_thresholds((prev) => ({ ...prev, step2: width }))
    }
  }, [compact_step])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      if (thresholds.step0 && width >= thresholds.step0) {
        set_compact_step(0)
      } else if (thresholds.step1 && width >= thresholds.step1) {
        set_compact_step(1)
      } else if (thresholds.step2 && width >= thresholds.step2) {
        set_compact_step(2)
      } else if (thresholds.step0 && width < thresholds.step0) {
        if (compact_step == 0) set_compact_step(1)
        else if (
          compact_step == 1 &&
          thresholds.step1 &&
          width < thresholds.step1
        )
          set_compact_step(2)
        else if (
          compact_step == 2 &&
          thresholds.step2 &&
          width < thresholds.step2
        )
          set_compact_step(3)
      }
    })
    if (container_ref.current) observer.observe(container_ref.current)
    return () => observer.disconnect()
  }, [thresholds, compact_step])

  return {
    container_ref,
    left_ref,
    right_ref,
    compact_step
  }
}
