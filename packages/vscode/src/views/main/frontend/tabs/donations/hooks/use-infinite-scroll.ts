import { useEffect, useRef, useCallback } from 'react'

const threshold = 100

export const use_infinite_scroll = (params: {
  load_more: () => void
  has_more: boolean
  is_loading: boolean
}) => {
  const container_ref = useRef<HTMLDivElement>(null)

  const handle_scroll = useCallback(() => {
    const container = container_ref.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distance_from_bottom = scrollHeight - scrollTop - clientHeight

    if (
      distance_from_bottom < threshold &&
      params.has_more &&
      !params.is_loading
    ) {
      params.load_more()
    }
  }, [params.load_more, params.has_more, params.is_loading])

  useEffect(() => {
    const container = container_ref.current
    if (!container) return

    container.addEventListener('scroll', handle_scroll)
    return () => container.removeEventListener('scroll', handle_scroll)
  }, [handle_scroll])

  return container_ref
}
