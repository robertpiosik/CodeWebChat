import { useEffect, useState, useRef } from 'react'

export const use_keyboard_shortcuts = (params: {
  is_active: boolean
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  on_cli_calls_click: () => void
}) => {
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const alt_interrupted_ref = useRef(false)
  const left_alt_pressed_ref = useRef(false)

  const update_alt_pressed = (val: boolean) => {
    set_is_alt_pressed(val)
  }

  useEffect(() => {
    if (!params.is_active) {
      update_alt_pressed(false)
      return
    }

    const handle_key_down = (event: KeyboardEvent) => {
      if (event.code == 'AltLeft') {
        left_alt_pressed_ref.current = true
      }

      if (
        event.code == 'AltLeft' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (!alt_interrupted_ref.current) {
          update_alt_pressed(true)
        }
      } else {
        if (event.altKey) {
          alt_interrupted_ref.current = true
        }

        update_alt_pressed(false)
      }

      if (
        event.altKey &&
        left_alt_pressed_ref.current &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        if (event.code == 'Digit1' || event.code == 'Numpad1') {
          event.preventDefault()
          params.on_chatbots_click()
        } else if (event.code == 'Digit2' || event.code == 'Numpad2') {
          event.preventDefault()
          params.on_api_calls_click()
        } else if (event.code == 'Digit3' || event.code == 'Numpad3') {
          event.preventDefault()
          params.on_cli_calls_click()
        }
      }
    }

    const handle_key_up = (event: KeyboardEvent) => {
      if (event.code == 'AltLeft') {
        left_alt_pressed_ref.current = false
      }

      if (!event.altKey) {
        alt_interrupted_ref.current = false
      } else if (event.code != 'AltLeft') {
        alt_interrupted_ref.current = true
      }
      update_alt_pressed(
        event.altKey &&
          left_alt_pressed_ref.current &&
          !alt_interrupted_ref.current &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey
      )
    }

    const handle_blur = () => {
      left_alt_pressed_ref.current = false
      update_alt_pressed(false)
      alt_interrupted_ref.current = false
    }

    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('keyup', handle_key_up)
    window.addEventListener('blur', handle_blur)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('keyup', handle_key_up)
      window.removeEventListener('blur', handle_blur)
    }
  }, [
    params.is_active,
    params.on_chatbots_click,
    params.on_api_calls_click,
    params.on_cli_calls_click
  ])

  return { is_alt_pressed }
}
