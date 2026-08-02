import { useEffect, useState, useRef } from 'react'
import { use_is_mac } from '@shared/hooks'
import { MODE, Mode } from '@/views/prompt/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import {
  api_prompt_type_labels,
  web_prompt_type_labels
} from '../../../prompt-type-labels'

export const use_keyboard_shortcuts = (params: {
  mode: Mode
  handle_heading_click: () => void
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  on_show_home: () => void
  is_disabled: boolean
}) => {
  const is_mac = use_is_mac()
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const alt_interrupted_ref = useRef(false)
  const is_alt_pressed_raw_ref = useRef(false)
  const pending_mode_ref = useRef<Mode | null>(null)

  const update_alt_pressed = (val: boolean) => {
    is_alt_pressed_raw_ref.current = val
    if (pending_mode_ref.current) {
      if (val) set_is_alt_pressed(true)
    } else {
      set_is_alt_pressed(val)
    }
  }

  useEffect(() => {
    if (pending_mode_ref.current === params.mode) {
      pending_mode_ref.current = null
      set_is_alt_pressed(is_alt_pressed_raw_ref.current)
    }
  }, [params.mode])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      let next_mode: Mode | undefined

      if (
        event.key == 'Escape' &&
        event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey
      ) {
        next_mode = params.mode === MODE.WEB ? MODE.API : MODE.WEB
      }

      if (
        event.key == 'Alt' &&
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

        if (next_mode && params.mode !== next_mode) {
          pending_mode_ref.current = next_mode
          update_alt_pressed(false)
        } else {
          update_alt_pressed(false)
        }
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
      } else if (next_mode) {
        event.preventDefault()
        params.handle_heading_click()
      }
    }

    const handle_key_up = (event: KeyboardEvent) => {
      if (!event.altKey) {
        alt_interrupted_ref.current = false
      } else if (event.key != 'Alt') {
        alt_interrupted_ref.current = true
      }
      update_alt_pressed(
        event.altKey &&
          !alt_interrupted_ref.current &&
          !event.shiftKey &&
          !event.ctrlKey &&
          !event.metaKey
      )
    }

    const handle_blur = () => {
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
  }, [
    params.is_disabled,
    params.on_show_home,
    is_mac,
    params.handle_heading_click,
    params.mode
  ])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (params.is_disabled) return

      if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey) {
        return
      }

      if (!event.code.startsWith('Key')) {
        return
      }

      const key = event.code.replace('Key', '').toLowerCase()

      if (params.mode == MODE.WEB) {
        for (const [value, label] of Object.entries(web_prompt_type_labels)) {
          if (label.toLowerCase().startsWith(key)) {
            params.on_web_prompt_type_change(value as WebPromptType)
            event.preventDefault()
            return
          }
        }
      } else if (params.mode == MODE.API) {
        for (const [value, label] of Object.entries(api_prompt_type_labels)) {
          if (label.toLowerCase().startsWith(key)) {
            params.on_api_prompt_type_change(value as ApiPromptType)
            event.preventDefault()
            return
          }
        }
      }
    }

    window.addEventListener('keydown', handle_key_down)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
    }
  }, [
    params.mode,
    params.on_web_prompt_type_change,
    params.on_api_prompt_type_change,
    params.is_disabled
  ])

  return { is_alt_pressed }
}
