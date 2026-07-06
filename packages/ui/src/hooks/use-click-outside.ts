import { RefObject, useEffect } from 'react'

export const use_click_outside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  callback: (event: MouseEvent) => void,
  is_active: boolean = true
) => {
  useEffect(() => {
    const handle_click_outside = (event: MouseEvent) => {
      if (
        is_active &&
        ref.current &&
        !ref.current.contains(event.target as Node)
      ) {
        callback(event)
      }
    }

    document.addEventListener('mousedown', handle_click_outside)

    return () => {
      document.removeEventListener('mousedown', handle_click_outside)
    }
  }, [ref, callback, is_active])
}
