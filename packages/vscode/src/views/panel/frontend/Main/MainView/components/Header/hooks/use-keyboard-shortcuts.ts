import { useEffect } from 'react'
import { use_is_mac } from '@shared/hooks'
import { MODE, Mode } from '@/views/panel/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { api_mode_labels, web_mode_labels } from '../../../modes'

type UseKeyboardShortcutsParams = {
  mode: Mode
  handle_heading_click: () => void
  on_web_prompt_type_change: (mode: WebPromptType) => void
  on_api_prompt_type_change: (mode: ApiPromptType) => void
  on_show_home: () => void
  is_disabled: boolean
}

export const use_keyboard_shortcuts = ({
  mode,
  handle_heading_click,
  on_web_prompt_type_change,
  on_api_prompt_type_change,
  on_show_home,
  is_disabled
}: UseKeyboardShortcutsParams) => {
  const is_mac = use_is_mac()

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (is_disabled) return

      if (
        event.key == 'Escape' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        on_show_home()
      } else if (
        event.key == 'Escape' &&
        ((is_mac && event.metaKey) || (!is_mac && event.ctrlKey))
      ) {
        event.preventDefault()
        handle_heading_click()
      }
    }

    const handle_mouse_up = (event: MouseEvent) => {
      if (is_disabled) return

      if (event.button == 3) {
        on_show_home()
      }
    }

    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('mouseup', handle_mouse_up)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('mouseup', handle_mouse_up)
    }
  }, [is_disabled, on_show_home, is_mac, handle_heading_click])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (is_disabled) return

      if (!event.altKey || !event.shiftKey || event.metaKey || event.ctrlKey) {
        return
      }

      if (!event.code.startsWith('Key')) {
        return
      }

      const key = event.code.replace('Key', '').toLowerCase()

      if (mode == MODE.WEB) {
        for (const [value, label] of Object.entries(web_mode_labels)) {
          if (label.toLowerCase().startsWith(key)) {
            on_web_prompt_type_change(value as WebPromptType)
            event.preventDefault()
            return
          }
        }
      } else if (mode == MODE.API) {
        for (const [value, label] of Object.entries(api_mode_labels)) {
          if (label.toLowerCase().startsWith(key)) {
            on_api_prompt_type_change(value as ApiPromptType)
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
  }, [mode, on_web_prompt_type_change, on_api_prompt_type_change, is_disabled])
}
