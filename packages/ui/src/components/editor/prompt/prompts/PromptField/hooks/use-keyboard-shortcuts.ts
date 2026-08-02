import { useState, useEffect, useRef } from 'react'
import type { PromptFieldProps, EditFormat } from '../PromptField'

export const use_keyboard_shortcuts = (
  props: PromptFieldProps,
  params: {
    on_toggle_invocation_dropdown?: () => void
    is_invocation_dropdown_open?: boolean
  }
) => {
  const [is_alt_pressed, set_is_alt_pressed] = useState(false)
  const is_alt_pressed_raw_ref = useRef(false)
  const pending_edit_format_ref = useRef<EditFormat | null>(null)

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

  const is_alt_x_down_ref = useRef(false)
  const has_set_count_during_alt_x_ref = useRef(false)
  const alt_interrupted_ref = useRef(false)

  useEffect(() => {
    const handle_key_down = (e: KeyboardEvent) => {
      let format: EditFormat | undefined
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
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

      if (e.key == 'Alt' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
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
          setTimeout(() => {
            if (pending_edit_format_ref.current === format) {
              pending_edit_format_ref.current = null
              set_is_alt_pressed(is_alt_pressed_raw_ref.current)
            }
          }, 100)
        } else {
          update_alt_pressed(false)
        }
      }

      if (
        params.on_toggle_invocation_dropdown &&
        e.code == 'KeyX' &&
        e.altKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        e.preventDefault()
        if (!e.repeat) {
          is_alt_x_down_ref.current = true
          has_set_count_during_alt_x_ref.current = false
        }
        return
      }

      if (
        (params.is_invocation_dropdown_open || is_alt_x_down_ref.current) &&
        props.on_invocation_count_change &&
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
        }

        if (count > 0) {
          e.preventDefault()
          if (!e.repeat) {
            props.on_invocation_count_change(count)
            if (is_alt_x_down_ref.current) {
              has_set_count_during_alt_x_ref.current = true
            }
            if (
              params.is_invocation_dropdown_open &&
              params.on_toggle_invocation_dropdown
            ) {
              params.on_toggle_invocation_dropdown()
            }
          }
          return
        }
      }

      if (format) {
        e.preventDefault()
        props.on_edit_format_change!(format)
        return
      }
    }
    const handle_key_up = (e: KeyboardEvent) => {
      if (!e.altKey) {
        alt_interrupted_ref.current = false
      } else if (e.key != 'Alt') {
        alt_interrupted_ref.current = true
      }
      update_alt_pressed(
        e.altKey &&
          !alt_interrupted_ref.current &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.metaKey
      )

      if (e.code == 'KeyX' && is_alt_x_down_ref.current) {
        is_alt_x_down_ref.current = false
      }
    }
    const handle_blur = () => {
      update_alt_pressed(false)
      is_alt_x_down_ref.current = false
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
    props.show_edit_format_selector,
    props.on_edit_format_change,
    props.on_invocation_count_change,
    props.edit_format,
    params.on_toggle_invocation_dropdown,
    params.is_invocation_dropdown_open
  ])

  const handle_container_key_down = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key == 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
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
