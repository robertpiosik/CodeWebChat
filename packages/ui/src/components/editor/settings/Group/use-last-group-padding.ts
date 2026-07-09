import { useEffect, useRef } from 'react'
import { SECTION_HEADER_HEIGHT } from '../../../../constants/sizes'

export const use_last_group_padding = (is_last?: boolean) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!is_last || !ref.current) {
      if (ref.current) {
        ref.current.style.paddingBottom = ''
      }
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry && ref.current) {
        ref.current.style.paddingBottom = `calc(100vh - ${entry.contentRect.height}px - ${SECTION_HEADER_HEIGHT}px)`
      }
    })

    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      if (ref.current) ref.current.style.paddingBottom = ''
    }
  }, [is_last])

  return ref
}
