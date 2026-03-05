import { useState, useEffect } from 'react'
import type { PromptFieldProps, EditFormat } from '../PromptField'

export const use_keyboard_shortcuts = (
  props: PromptFieldProps,
  params: {
    on_toggle_invocation_dropdown?: () => void
    is_invocation_dropdown_open?: boolean
  }
) => {
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)

  useEffect(() => {
    const handle_key_down = (e: KeyboardEvent) => {
      if (e.key == 'Alt') set_is_alt_pressed(true)

      if (
        params.on_toggle_invocation_dropdown &&
        e.code == 'KeyX' &&
        e.altKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault()
        params.on_toggle_invocation_dropdown()
        return
      }

      if (
        params.is_invocation_dropdown_open &&
        props.on_invocation_count_change &&
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
          props.on_invocation_count_change(count)
          params.on_toggle_invocation_dropdown?.()
          return
        }
      }

      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (props.show_edit_format_selector && props.on_edit_format_change) {
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
            props.on_edit_format_change(format)
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
    props.show_edit_format_selector,
    props.on_edit_format_change,
    props.on_invocation_count_change,
    params.on_toggle_invocation_dropdown,
    params.is_invocation_dropdown_open
  ])

  const handle_container_key_down = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key == 'Escape' && !e.ctrlKey && !e.metaKey) {
      if (props.is_recording) {
        props.on_recording_finished()
      }
      e.stopPropagation()
      return
    }
    if (e.key == 'c' && e.altKey && (e.ctrlKey || e.metaKey)) {
      if (props.on_copy) {
        e.stopPropagation()
        e.preventDefault()
        props.on_copy()
      }
    }
  }

  return { is_alt_pressed, handle_container_key_down }
}
