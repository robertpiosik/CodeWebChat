import { useState } from 'react'
import { ChatInputProps } from '../ChatInput'
import { get_display_text } from '../utils/get-display-text'
import {
  get_caret_position_from_div,
  set_caret_position_for_div
} from '../utils/caret'

const reconstruct_raw_value_from_node = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement

    if (el.dataset.type === 'file-keyword') {
      const path = el.getAttribute('title')
      if (path) {
        return `\`${path}\``
      }
    }

    if (el.dataset.type === 'selection-keyword') {
      return el.textContent || ''
    }

    if (el.childNodes.length > 0) {
      let content = ''
      for (const child of Array.from(el.childNodes)) {
        content += reconstruct_raw_value_from_node(child)
      }
      return content
    }

    return el.textContent || ''
  }

  return ''
}

export const use_handlers = (props: ChatInputProps) => {
  const [history_index, set_history_index] = useState(-1)
  const [is_history_enabled, set_is_history_enabled] = useState(!props.value)
  const [saved_value_before_at_sign, set_saved_value_before_at_sign] = useState<
    string | null
  >(null)

  const handle_clear = () => {
    props.on_change('')
    set_history_index(-1)
    set_is_history_enabled(true)
    set_saved_value_before_at_sign(null)
  }

  const handle_input_change = (e: React.FormEvent<HTMLDivElement>) => {
    const new_value = reconstruct_raw_value_from_node(e.currentTarget)

    if (new_value === props.value) {
      return
    }
    props.on_change(new_value)
    set_history_index(-1)

    set_saved_value_before_at_sign(null)

    const new_display_value = e.currentTarget.textContent ?? ''
    const caret_position = get_caret_position_from_div(e.currentTarget)
    if (new_display_value.charAt(caret_position - 1) == '@') {
      set_saved_value_before_at_sign(props.value)
      setTimeout(() => {
        props.on_at_sign_click()
      }, 150)
    } else if (new_display_value.charAt(caret_position - 1) == '#') {
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
      | React.KeyboardEvent<HTMLDivElement>
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

  const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key == 'Enter' && !e.shiftKey) {
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
        const display_restored = get_display_text(
          restored_value,
          props.context_file_paths ?? []
        )
        set_caret_position_for_div(e.currentTarget, display_restored.length)
      }, 0)
    } else if (props.value) {
      set_is_history_enabled(false)
    }
  }

  return {
    handle_input_change,
    handle_submit,
    handle_key_down,
    is_history_enabled,
    handle_clear
  }
}
