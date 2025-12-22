import { useRef, useLayoutEffect } from 'react'
import { use_compacting } from '@shared/hooks'

export const use_edit_format_compacting = () => {
  const { container_ref, compact_step, report_width } = use_compacting(4)
  const format_whole_ref = useRef<HTMLButtonElement>(null)
  const format_truncated_ref = useRef<HTMLButtonElement>(null)
  const format_before_after_ref = useRef<HTMLButtonElement>(null)
  const format_diff_ref = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const refs = [
      format_whole_ref,
      format_truncated_ref,
      format_before_after_ref,
      format_diff_ref
    ]

    if (refs.every((ref) => ref.current)) {
      // Calculate total width of all elements
      const total_width = refs.reduce(
        (acc, ref) => acc + (ref.current?.offsetWidth || 0),
        0
      )
      // Add gap (4px * 3 gaps)
      const width = total_width + 12

      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

  return {
    container_ref,
    compact_step,
    format_whole_ref,
    format_truncated_ref,
    format_before_after_ref,
    format_diff_ref
  }
}
