import { useState, useEffect } from 'react'
import type { PromptFieldProps, EditFormat } from '../PromptField'

type UseKeyboardShortcutsParams = Pick<
  PromptFieldProps,
  | 'show_edit_format_selector'
  | 'on_edit_format_change'
  | 'on_search_click'
  | 'on_copy'
  | 'on_invocation_count_change'
> & {
  on_toggle_invocation_dropdown?: () => void
  is_invocation_dropdown_open?: boolean
}

export const use_keyboard_shortcuts = (params: UseKeyboardShortcutsParams) => {
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)

  const {
    on_toggle_invocation_dropdown,
    is_invocation_dropdown_open,
    on_invocation_count_change
  } = params

  useEffect(() => {
    const handle_key_down = (e: KeyboardEvent) => {
      if (e.key == 'Alt') set_is_alt_pressed(true)

      if (
        on_toggle_invocation_dropdown &&
        e.code == 'KeyX' &&
        e.altKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault()
        on_toggle_invocation_dropdown()
        return
      }

      if (
        is_invocation_dropdown_open &&
        on_invocation_count_change &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        let count = 0
        switch (e.code) {
          case 'Digit1':
            count = 1
            break
          case 'Digit2':
            count = 2
            break
          case 'Digit3':
            count = 3
            break
          case 'Digit4':
            count = 4
            break
          case 'Digit5':
            count = 5
            break
        }

        if (count > 0) {
          e.preventDefault()
          on_invocation_count_change(count)
          on_toggle_invocation_dropdown?.()
          return
        }
      }

      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (params.show_edit_format_selector && params.on_edit_format_change) {
          let format: EditFormat | undefined
          switch (e.code) {
            case 'KeyW':
              format = 'whole'
              break
            case 'KeyT':
              format = 'truncated'
              break
            case 'KeyB':
              format = 'before-after'
              break
            case 'KeyD':
              format = 'diff'
              break
          }
          if (format) {
            e.preventDefault()
            params.on_edit_format_change(format)
            return
          }
        }
      }
    }
    const handle_key_up = (e: KeyboardEvent) => {
      if (e.key == 'Alt') set_is_alt_pressed(false)
    }
    const handle_blur = () => {
      set_is_alt_pressed(false)
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
    params.show_edit_format_selector,
    params.on_edit_format_change,
    on_invocation_count_change,
    on_toggle_invocation_dropdown,
    is_invocation_dropdown_open
  ])

  const handle_container_key_down = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key == 'Escape' && !e.ctrlKey && !e.metaKey) {
      e.stopPropagation()
      return
    }
    if (e.key == 'f' && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation()
      params.on_search_click()
    }
    if (e.key == 'c' && e.altKey && (e.ctrlKey || e.metaKey)) {
      if (params.on_copy) {
        e.stopPropagation()
        e.preventDefault()
        params.on_copy()
      }
    }
  }

  return { is_alt_pressed, handle_container_key_down }
}
