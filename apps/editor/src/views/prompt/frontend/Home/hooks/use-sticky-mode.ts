import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect
} from 'react'

export const use_sticky_mode = (is_active: boolean) => {
  const [state, set_state] = useState<'normal' | 'sticky' | 'hiding'>('normal')
  const [is_animating_in, set_is_animating_in] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animate_in_timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const normal_height = useRef(0)
  const responses_ref = useRef<HTMLDivElement>(null)
  const mode_ref = useRef<HTMLDivElement>(null)
  const prev_top = useRef(0)
  const prev_state = useRef(state)

  const is_mode_sticky = state !== 'normal'

  useLayoutEffect(() => {
    if (state == 'sticky' && prev_state.current !== 'sticky') {
      set_is_animating_in(true)
      if (animate_in_timeout.current) clearTimeout(animate_in_timeout.current)
      animate_in_timeout.current = setTimeout(() => {
        set_is_animating_in(false)
      }, 300)
    } else if (state != 'sticky') {
      set_is_animating_in(false)
      if (animate_in_timeout.current) clearTimeout(animate_in_timeout.current)
    }
    prev_state.current = state
  }, [state])

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current)
      if (animate_in_timeout.current) clearTimeout(animate_in_timeout.current)
    }
  }, [])

  const handle_scroll = useCallback(
    (top: number) => {
      if (!is_active) return

      const r_height = responses_ref.current?.clientHeight || 0
      const m_height = mode_ref.current?.offsetHeight || 0

      if (m_height == 0) return

      if (!is_mode_sticky) {
        normal_height.current = m_height
      }

      const height_to_use = is_mode_sticky ? normal_height.current : m_height
      const is_past = top > r_height + height_to_use + 4

      const is_up = top < prev_top.current
      const is_down = top > prev_top.current
      prev_top.current = top

      set_state((prev) => {
        if (!is_past) {
          if (timeout.current) clearTimeout(timeout.current)
          return 'normal'
        }
        if (is_up && prev !== 'sticky') {
          if (timeout.current) clearTimeout(timeout.current)
          return 'sticky'
        }
        if (is_down && prev === 'sticky') {
          timeout.current = setTimeout(() => {
            set_state((s) => (s === 'hiding' ? 'normal' : s))
          }, 250)
          return 'hiding'
        }
        return prev
      })
    },
    [is_mode_sticky, is_active]
  )

  return {
    is_mode_sticky,
    is_hiding: state === 'hiding',
    is_animating_in,
    responses_ref,
    mode_ref,
    handle_scroll
  }
}
