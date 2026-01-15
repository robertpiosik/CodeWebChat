import { useState, useRef, useEffect } from 'react'

export const use_timeline_scroll = () => {
  const [is_timeline_reached, set_is_timeline_reached] = useState(true)
  const timeline_ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const is_above_viewport =
          entry.boundingClientRect.top <
          (entry.rootBounds?.height ?? window.innerHeight) / 2
        set_is_timeline_reached(entry.isIntersecting || is_above_viewport)
      },
      {
        threshold: 0.1
      }
    )

    if (timeline_ref.current) {
      observer.observe(timeline_ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  const handle_scroll_to_timeline = () => {
    if (timeline_ref.current) {
      let container = timeline_ref.current.parentElement
      while (container) {
        const style = window.getComputedStyle(container)
        if (
          (style.overflowY == 'auto' || style.overflowY == 'scroll') &&
          container.scrollHeight > container.clientHeight
        ) {
          const container_rect = container.getBoundingClientRect()
          const element_rect = timeline_ref.current.getBoundingClientRect()
          container.scrollTo({
            top:
              container.scrollTop +
              (element_rect.top - container_rect.top) -
              55,
            behavior: 'smooth'
          })
          return
        }
        container = container.parentElement
      }

      timeline_ref.current.style.scrollMarginTop = '55px'
      timeline_ref.current.scrollIntoView({
        behavior: 'smooth'
      })
    }
  }

  return {
    is_timeline_reached,
    timeline_ref,
    handle_scroll_to_timeline
  }
}
