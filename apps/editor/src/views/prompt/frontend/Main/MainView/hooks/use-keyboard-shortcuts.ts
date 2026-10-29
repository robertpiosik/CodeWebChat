import { useEffect } from 'react'
import { use_alt_pressed } from '@/views/prompt/frontend/hooks/use-alt-pressed'
import { Target } from '@shared/types/target'
import {
  ApiPromptType,
  WebPromptType,
  CliPromptType
} from '@shared/types/prompt-types'

export const use_keyboard_shortcuts = (params: {
  target: Target
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  on_cli_prompt_type_change: (prompt_type: CliPromptType) => void
  on_show_home: () => void
  on_agentic_search?: () => void
  is_disabled: boolean
}) => {
  const { is_alt_pressed, pressed_keys_ref } = use_alt_pressed()

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (params.is_disabled) return

      if (
        event.key === 'Escape' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        params.on_show_home()
      }
    }

    const handle_mouse_up = (event: MouseEvent) => {
      if (params.is_disabled) return

      if (event.button === 3) {
        params.on_show_home()
      }
    }

    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('mouseup', handle_mouse_up)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('mouseup', handle_mouse_up)
    }
  }, [params.is_disabled, params.on_show_home])

  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (params.is_disabled) return

      if (
        !event.altKey ||
        !pressed_keys_ref.current.has('AltLeft') ||
        event.shiftKey ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return
      }

      if (event.code === 'KeyE') {
        event.preventDefault()

        if (params.target === 'API') {
          params.on_api_prompt_type_change('edit')
        } else if (params.target === 'CLI') {
          params.on_cli_prompt_type_change('edit')
        } else {
          params.on_web_prompt_type_change('edit')
        }
        return
      }

      if (event.code === 'KeyA') {
        if (params.target === 'WEB') {
          event.preventDefault()
          params.on_web_prompt_type_change('ask')
          return
        } else if (params.target === 'CLI') {
          event.preventDefault()
          params.on_cli_prompt_type_change('ask')
          return
        }
      }

      if (event.code === 'KeyF') {
        event.preventDefault()
        params.on_agentic_search?.()
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
    params.on_cli_prompt_type_change,
    params.on_agentic_search,
    params.is_disabled
  ])

  return { is_alt_pressed }
}
