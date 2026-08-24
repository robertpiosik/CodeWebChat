import { useEffect } from 'react'

type Params = {
  is_active: boolean
  on_go_forward: () => void
  on_chatbots_click: () => void
  on_api_calls_click: () => void
}

export const use_keyboard_shortcuts = (params: Params) => {
  useEffect(() => {
    const handle_mouse_up = (event: MouseEvent) => {
      if (params.is_active && event.button == 4) {
        params.on_go_forward()
      }
    }

    const handle_key_down = (event: KeyboardEvent) => {
      if (!params.is_active) return

      if (event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        if (event.code == 'Digit1') {
          event.preventDefault()
          params.on_chatbots_click()
        } else if (event.code == 'Digit2') {
          event.preventDefault()
          params.on_api_calls_click()
        }
      }
    }

    window.addEventListener('mouseup', handle_mouse_up)
    window.addEventListener('keydown', handle_key_down)
    return () => {
      window.removeEventListener('mouseup', handle_mouse_up)
      window.removeEventListener('keydown', handle_key_down)
    }
  }, [
    params.is_active,
    params.on_go_forward,
    params.on_chatbots_click,
    params.on_api_calls_click
  ])
}
