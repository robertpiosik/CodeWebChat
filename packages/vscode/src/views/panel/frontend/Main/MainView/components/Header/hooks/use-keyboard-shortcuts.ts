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
}

export const use_keyboard_shortcuts = ({
  mode,
  handle_heading_click,
  on_web_prompt_type_change,
  on_api_prompt_type_change,
}: UseKeyboardShortcutsParams) => {
  const is_mac = use_is_mac()

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (
        event.key == 'Escape' &&
        ((is_mac && event.metaKey) || (!is_mac && event.ctrlKey))
      ) {
        event.preventDefault()
        handle_heading_click()
      }
    }

    window.addEventListener('keydown', handle_key_down)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
    }
  }, [is_mac, handle_heading_click])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
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
  }, [mode, on_web_prompt_type_change, on_api_prompt_type_change])
}