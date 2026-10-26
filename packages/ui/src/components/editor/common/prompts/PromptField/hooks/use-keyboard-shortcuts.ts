import { useState, useEffect, useRef } from 'react'
import type { PromptField, EditFormat } from '../PromptField'

export const use_keyboard_shortcuts = (props: PromptField.Props) => {
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const is_alt_pressed_raw_ref = useRef(false)
  const pending_edit_format_ref = useRef<EditFormat | null>(null)
  const left_alt_pressed_ref = useRef(false)

  const update_alt_pressed = (val: boolean) => {
    is_alt_pressed_raw_ref.current = val
    if (pending_edit_format_ref.current) {
      if (val) set_is_alt_pressed(true)
    } else {
      set_is_alt_pressed(val)
    }
  }

  useEffect(() => {
    if (pending_edit_format_ref.current === props.edit_format) {
      pending_edit_format_ref.current = null
      set_is_alt_pressed(is_alt_pressed_raw_ref.current)
    }
  }, [props.edit_format])

  const alt_interrupted_ref = useRef(false)

  useEffect(() => {
    const handle_key_down = (e: KeyboardEvent) => {
      if (props.are_keyboard_shortcuts_disabled) return
      if (e.code === 'AltLeft') {
        left_alt_pressed_ref.current = true
      }

      let format: EditFormat | undefined
      if (
        e.altKey &&
        left_alt_pressed_ref.current &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        if (e.code === 'Digit1') {
          e.preventDefault()
          props.on_target_change?.('WEB')
          return
        }
        if (e.code === 'Digit2') {
          e.preventDefault()
          props.on_target_change?.('API')
          return
        }
        if (e.code === 'Digit3') {
          e.preventDefault()
          props.on_target_change?.('CLI')
          return
        }

        if (props.show_edit_format_selector && props.on_edit_format_change) {
          switch (e.code) {
            case 'KeyW':
              format = 'whole'
              break
            case 'KeyT':
              format = 'truncated'
              break
            case 'KeyS':
              format = 'search-replace'
              break
            case 'KeyD':
              format = 'diff'
              break
          }
        }
      }

      if (e.code === 'AltLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (!alt_interrupted_ref.current) {
          update_alt_pressed(true)
        }
      } else {
        if (e.altKey) {
          alt_interrupted_ref.current = true
        }

        if (format && props.edit_format !== format) {
          pending_edit_format_ref.current = format
          update_alt_pressed(false)
        } else {
          update_alt_pressed(false)
        }
      }

      if (format) {
        e.preventDefault()
        props.on_edit_format_change!(format)
        return
      }
    }
    const handle_key_up = (e: KeyboardEvent) => {
      if (e.code === 'AltLeft') {
        left_alt_pressed_ref.current = false
      }
      if (!e.altKey) {
        alt_interrupted_ref.current = false
      } else if (e.code !== 'AltLeft') {
        alt_interrupted_ref.current = true
      }
      update_alt_pressed(
        e.altKey &&
          left_alt_pressed_ref.current &&
          !alt_interrupted_ref.current &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.metaKey
      )
    }
    const handle_blur = () => {
      update_alt_pressed(false)
      alt_interrupted_ref.current = false
      left_alt_pressed_ref.current = false
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
    props.edit_format,
    props.are_keyboard_shortcuts_disabled
  ])

  const handle_container_key_down = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (props.are_keyboard_shortcuts_disabled) return

    const is_next_tab =
      (e.ctrlKey && e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.metaKey) ||
      (e.ctrlKey && e.key === 'PageDown' && !e.shiftKey && !e.altKey && !e.metaKey) ||
      (e.metaKey && e.altKey && e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey) ||
      (e.metaKey && e.shiftKey && (e.key === ']' || e.key === '}' || e.code === 'BracketRight') && !e.altKey && !e.ctrlKey)

    const is_prev_tab =
      (e.ctrlKey && e.key === 'Tab' && e.shiftKey && !e.altKey && !e.metaKey) ||
      (e.ctrlKey && e.key === 'PageUp' && !e.shiftKey && !e.altKey && !e.metaKey) ||
      (e.metaKey && e.altKey && e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey) ||
      (e.metaKey && e.shiftKey && (e.key === '[' || e.key === '{' || e.code === 'BracketLeft') && !e.altKey && !e.ctrlKey)

    if (is_next_tab) {
      e.preventDefault()
      e.stopPropagation()
      if (props.tabs_count > 1) {
        props.on_tab_change((props.active_tab_index + 1) % props.tabs_count)
      }
      return
    }

    if (is_prev_tab) {
      e.preventDefault()
      e.stopPropagation()
      if (props.tabs_count > 1) {
        props.on_tab_change(
          (props.active_tab_index - 1 + props.tabs_count) % props.tabs_count
        )
      }
      return
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key.toLowerCase() === 'w') {
        if (props.tabs_count > 1) {
          e.preventDefault()
          e.stopPropagation()
          props.on_tab_delete(props.active_tab_index)
          return
        }
      }

      if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        e.stopPropagation()
        props.on_new_tab()
        return
      }

      const match = e.key.match(/^[1-9]$/)
      if (match) {
        const index = parseInt(match[0], 10) - 1
        if (index < props.tabs_count) {
          e.preventDefault()
          e.stopPropagation()
          props.on_tab_change(index)
          return
        } else if (index === props.tabs_count) {
          e.preventDefault()
          e.stopPropagation()
          props.on_new_tab()
          return
        }
      }
    }

    if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (props.is_recording) {
        props.on_recording_finished()
      }
      e.stopPropagation()
      return
    }
    if (
      e.key === 'c' &&
      e.altKey &&
      left_alt_pressed_ref.current &&
      (e.ctrlKey || e.metaKey)
    ) {
      if (props.on_copy && props.target === 'WEB') {
        e.stopPropagation()
        e.preventDefault()
        props.on_copy()
      }
    }
    if (
      e.code === 'KeyC' &&
      e.altKey &&
      left_alt_pressed_ref.current &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey
    ) {
      if (props.on_task_completed) {
        e.stopPropagation()
        e.preventDefault()
        props.on_task_completed()
      }
    }
    if (
      e.code === 'KeyX' &&
      e.altKey &&
      left_alt_pressed_ref.current &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey
    ) {
      if (props.on_clear_context) {
        e.stopPropagation()
        e.preventDefault()
        props.on_clear_context()
      }
    }
  }

  return { is_alt_pressed, handle_container_key_down }
}
