import { useState, useRef, useCallback } from 'react'

export const use_has_scrolled_past_mode_button = (is_active: boolean) => {
  const [state, set_state] = useState<'normal' | 'sticky'>('normal')
  const normal_height = useRef(0)
  const responses_ref = useRef<HTMLDivElement>(null)
  const mode_ref = useRef<HTMLDivElement>(null)

  const has_scrolled_past_mode_button = state !== 'normal'

  const handle_scroll = useCallback(
    (top: number) => {
      if (!is_active) return

      const r_height = responses_ref.current?.clientHeight || 0
      const m_height = mode_ref.current?.offsetHeight || 0

      if (m_height == 0) return

      if (!has_scrolled_past_mode_button) {
        normal_height.current = m_height
      }

      const height_to_use = has_scrolled_past_mode_button
        ? normal_height.current
        : m_height
      const is_past = top > r_height + height_to_use + 4

      set_state((prev) => {
        if (!is_past) {
          return 'normal'
        }
        if (prev !== 'sticky') {
          return 'sticky'
        }
        return prev
      })
    },
    [has_scrolled_past_mode_button, is_active]
  )

  return {
    has_scrolled_past_mode_button,
    responses_ref,
    mode_ref,
    handle_scroll
  }
}
