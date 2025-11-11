import { useState } from 'react'
import { ChatInputProps } from '../ChatInput'

export const use_handlers = (props: ChatInputProps) => {
  const [history_index, set_history_index] = useState(-1)
  const [is_history_enabled, set_is_history_enabled] = useState(!props.value)
  const [saved_value_before_at_sign, set_saved_value_before_at_sign] = useState<
    string | null
  >(null)

  const handle_select = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const caret_position = textarea.selectionStart
    props.on_caret_position_change(caret_position)
  }

  const handle_clear = () => {
    props.on_change('')
    set_history_index(-1)
    set_is_history_enabled(true)
    set_saved_value_before_at_sign(null)
  }

  const handle_input_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const new_value = e.target.value
    props.on_change(new_value)
    set_history_index(-1)

    // Clear saved value on any input change
    set_saved_value_before_at_sign(null)

    const textarea = e.target
    const caret_position = textarea.selectionStart
    if (new_value.charAt(caret_position - 1) == '@') {
      set_saved_value_before_at_sign(props.value)
      setTimeout(() => {
        props.on_at_sign_click()
      }, 150)
    } else if (new_value.charAt(caret_position - 1) == '#') {
      setTimeout(() => {
        props.on_hash_sign_click()
      }, 150)
    }

    if (!new_value) {
      set_is_history_enabled(true)
    }
  }

  const handle_submit = (
    e:
      | React.KeyboardEvent<HTMLTextAreaElement>
      | React.MouseEvent<HTMLButtonElement>,
    with_control?: boolean
  ) => {
    e.stopPropagation()
    if (with_control || e.ctrlKey || e.metaKey) {
      props.on_submit_with_control()
    } else {
      props.on_submit()
    }
    set_history_index(-1)
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace') {
      const textarea = e.currentTarget
      const { selectionStart, selectionEnd, value } = textarea

      if (selectionStart > 0 && selectionStart === selectionEnd) {
        const text_before_cursor = value.substring(0, selectionStart)
        const path_regex = /`([^\s`]*\.[^\s`]+)`$/
        const match = text_before_cursor.match(path_regex)

        if (match) {
          const full_match = match[0] // e.g., `path/to/file.ts`
          const file_path = match[1] // e.g., path/to/file.ts

          if (props.context_file_paths?.includes(file_path)) {
            e.preventDefault()
            const new_caret_position = selectionStart - full_match.length
            const new_value =
              value.substring(0, new_caret_position) +
              value.substring(selectionStart)
            props.on_change(new_value)
            set_is_history_enabled(!new_value)

            setTimeout(() => {
              textarea.selectionStart = new_caret_position
              textarea.selectionEnd = new_caret_position
            }, 0)
            return
          }
        }
      }
    }
    if (e.key == 'Enter' && e.shiftKey) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const new_value =
        props.value.substring(0, start) + '\n' + props.value.substring(end)

      props.on_change(new_value)
      set_is_history_enabled(false)

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    } else if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handle_submit(e)
    } else if (
      (e.key == 'ArrowUp' || e.key == 'ArrowDown') &&
      is_history_enabled
    ) {
      set_saved_value_before_at_sign(null)

      const active_history = props.chat_history

      if (active_history.length == 0) return

      e.preventDefault()

      if (e.key == 'ArrowUp') {
        if (history_index < active_history.length - 1) {
          const new_index = history_index + 1
          set_history_index(new_index)
          props.on_change(active_history[new_index])
        }
      } else if (e.key == 'ArrowDown') {
        if (history_index > 0) {
          const new_index = history_index - 1
          set_history_index(new_index)
          props.on_change(active_history[new_index])
        } else if (history_index == 0) {
          set_history_index(-1)
          props.on_change('')
        }
      }
    } else if (
      e.key == 'z' &&
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      saved_value_before_at_sign !== null
    ) {
      // Handle Cmd/Ctrl + Z to undo @ sign action
      e.preventDefault()
      const restored_value = saved_value_before_at_sign
      set_saved_value_before_at_sign(null)
      props.on_change(restored_value)

      // Restore caret position
      setTimeout(() => {
        const textarea = e.currentTarget
        textarea.selectionStart = textarea.selectionEnd = restored_value.length
      }, 0)
    } else if (props.value) {
      set_is_history_enabled(false)
    }
  }

  return {
    handle_select,
    handle_input_change,
    handle_submit,
    handle_key_down,
    is_history_enabled,
    handle_clear
  }
}
