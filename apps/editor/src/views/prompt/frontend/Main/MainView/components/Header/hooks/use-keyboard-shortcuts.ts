import { useEffect, useState, useRef } from 'react'
import { TARGET, Target } from '@shared/types/mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const use_keyboard_shortcuts = (params: {
  target: Target
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  on_show_home: () => void
  is_disabled: boolean
}) => {
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const alt_interrupted_ref = useRef(false)
  const is_alt_pressed_raw_ref = useRef(false)
  const left_alt_pressed_ref = useRef(false)

  const update_alt_pressed = (val: boolean) => {
    is_alt_pressed_raw_ref.current = val
    set_is_alt_pressed(val)
  }

  useEffect(() => {
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

      if (params.is_disabled) return

      if (
        event.key == 'Escape' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        params.on_show_home()
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

    const handle_mouse_up = (event: MouseEvent) => {
      if (params.is_disabled) return

      if (event.button == 3) {
        params.on_show_home()
      }
    }

    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('keyup', handle_key_up)
    window.addEventListener('blur', handle_blur)
    window.addEventListener('mouseup', handle_mouse_up)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('keyup', handle_key_up)
      window.removeEventListener('blur', handle_blur)
      window.removeEventListener('mouseup', handle_mouse_up)
    }
  }, [params.is_disabled, params.on_show_home])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (params.is_disabled) return

      if (!event.altKey || !left_alt_pressed_ref.current || event.shiftKey || event.metaKey || event.ctrlKey) {
        return
      }

      if (event.code == 'KeyE') {
        event.preventDefault()

        if (params.target == TARGET.API) {
          params.on_api_prompt_type_change('edit-files')
        } else {
          params.on_web_prompt_type_change('edit-files')
        }
        return
      }

      if (event.code == 'KeyA' && params.target == TARGET.WEB) {
        event.preventDefault()
        params.on_web_prompt_type_change('ask-about-files')
        return
      }
    }

    window.addEventListener('keydown', handle_key_down)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
    }
  }, [
    params.target,
    params.on_web_prompt_type_change,
    params.on_api_prompt_type_change,
    params.is_disabled
  ])

  return { is_alt_pressed }
}
