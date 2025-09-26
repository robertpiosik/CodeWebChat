import { useState, useRef, useEffect, useCallback } from 'react'

export type ContextMenuState<T> = {
  x: number
  y: number
  data: T
}

export function use_context_menu<T>() {
  const [context_menu, set_context_menu] = useState<ContextMenuState<T> | null>(
    null
  )
  const context_menu_ref = useRef<HTMLDivElement>(null)

  const handle_context_menu = useCallback(
    (event: React.MouseEvent, data: T) => {
      event.preventDefault()
      event.stopPropagation()
      set_context_menu({
        x: event.clientX,
        y: event.clientY,
        data: data
      })
    },
    []
  )

  const close_context_menu = useCallback(() => {
    set_context_menu(null)
  }, [])

  useEffect(() => {
    const handle_outside_click = (event: MouseEvent) => {
      if (
        context_menu_ref.current &&
        !context_menu_ref.current.contains(event.target as Node)
      ) {
        event.stopPropagation()
        event.preventDefault()
        close_context_menu()
      }
    }

    const handle_scroll = () => {
      close_context_menu()
    }

    if (context_menu) {
      document.addEventListener('click', handle_outside_click, true)
      window.addEventListener('scroll', handle_scroll, true)
    }

    return () => {
      document.removeEventListener('click', handle_outside_click, true)
      window.removeEventListener('scroll', handle_scroll, true)
    }
  }, [context_menu, close_context_menu])

  return {
    context_menu,
    context_menu_ref,
    handle_context_menu,
    close_context_menu
  }
}
