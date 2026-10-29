import { useEffect, useRef, useState } from 'react'

export const use_alt_pressed = (params?: { is_active?: boolean }) => {
  const is_active = params?.is_active ?? true
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const pressed_keys_ref = useRef(new Set<string>())
  const is_alt_consumed_ref = useRef(false)

  useEffect(() => {
    if (!is_active) {
      set_is_alt_pressed(false)
      return
    }

    const handle_key_down = (event: KeyboardEvent) => {
      pressed_keys_ref.current.add(event.code)

      if (pressed_keys_ref.current.size > 1) {
        is_alt_consumed_ref.current = true
        set_is_alt_pressed(false)
      } else if (event.code === 'AltLeft') {
        is_alt_consumed_ref.current = false
        set_is_alt_pressed(true)
      }
    }

    const handle_key_up = (event: KeyboardEvent) => {
      pressed_keys_ref.current.delete(event.code)
      if (event.code === 'AltLeft') {
        is_alt_consumed_ref.current = false
      }

      if (pressed_keys_ref.current.size > 1 || is_alt_consumed_ref.current) {
        set_is_alt_pressed(false)
      } else if (pressed_keys_ref.current.has('AltLeft')) {
        set_is_alt_pressed(true)
      } else {
        set_is_alt_pressed(false)
      }
    }

    const handle_blur = () => {
      pressed_keys_ref.current.clear()
      is_alt_consumed_ref.current = false
      set_is_alt_pressed(false)
    }

    window.addEventListener('keydown', handle_key_down, true)
    window.addEventListener('keyup', handle_key_up, true)
    window.addEventListener('blur', handle_blur)

    return () => {
      window.removeEventListener('keydown', handle_key_down, true)
      window.removeEventListener('keyup', handle_key_up, true)
      window.removeEventListener('blur', handle_blur)
    }
  }, [is_active])

  return { is_alt_pressed, pressed_keys_ref }
}
