import { useState, useEffect, useRef } from 'react'
import type { PromptFieldProps, EditFormat } from '../PromptField'
import { TARGET } from '@shared/types/mode'

export const use_keyboard_shortcuts = (props: PromptFieldProps) => {
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
      if (e.code == 'AltLeft') {
        left_alt_pressed_ref.current = true
      }

      let format: EditFormat | undefined
      if (e.altKey && left_alt_pressed_ref.current && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (e.code == 'Escape') {
          e.preventDefault()
          if (props.on_target_change) {
            props.on_target_change(
              props.target == TARGET.WEB ? TARGET.API : TARGET.WEB
            )
          }
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

      if (e.code == 'AltLeft' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
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
      if (e.code == 'AltLeft') {
        left_alt_pressed_ref.current = false
      }
      if (!e.altKey) {
        alt_interrupted_ref.current = false
      } else if (e.code != 'AltLeft') {
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
    props.edit_format
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
    if (e.key == 'c' && e.altKey && left_alt_pressed_ref.current && (e.ctrlKey || e.metaKey)) {
      if (
        !props.is_action_disabled &&
        props.on_copy &&
        props.target == TARGET.WEB
      ) {
        e.stopPropagation()
        e.preventDefault()
        props.on_copy()
      }
    }
  }

  return { is_alt_pressed, handle_container_key_down }
}
