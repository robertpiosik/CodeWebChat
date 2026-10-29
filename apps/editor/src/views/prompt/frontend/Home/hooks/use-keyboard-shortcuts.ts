import { useEffect } from 'react'
import { use_alt_pressed } from '@/views/prompt/frontend/hooks/use-alt-pressed'

export const use_keyboard_shortcuts = (params: {
  is_active: boolean
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  on_cli_calls_click: () => void
}) => {
  const { is_alt_pressed, pressed_keys_ref } = use_alt_pressed({
    is_active: params.is_active
  })

  useEffect(() => {
    if (!params.is_active) return

    const handle_key_down = (event: KeyboardEvent) => {
      if (
        event.altKey &&
        pressed_keys_ref.current.has('AltLeft') &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        if (event.code === 'Digit1' || event.code === 'Numpad1') {
          event.preventDefault()
          params.on_chatbots_click()
        } else if (event.code === 'Digit2' || event.code === 'Numpad2') {
          event.preventDefault()
          params.on_api_calls_click()
        } else if (event.code === 'Digit3' || event.code === 'Numpad3') {
          event.preventDefault()
          params.on_cli_calls_click()
        }
      }
    }

    window.addEventListener('keydown', handle_key_down)

    return () => window.removeEventListener('keydown', handle_key_down)
  }, [
    params.is_active,
    params.on_chatbots_click,
    params.on_api_calls_click,
    params.on_cli_calls_click
  ])

  return { is_alt_pressed }
}
