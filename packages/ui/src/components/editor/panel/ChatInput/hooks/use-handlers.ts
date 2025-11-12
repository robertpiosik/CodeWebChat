import { useState } from 'react'
import { ChatInputProps } from '../ChatInput'
import { get_display_text } from '../utils/get-display-text'

const get_caret_position_from_div = (element: HTMLElement): number => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return 0
  }
  const range = selection.getRangeAt(0)
  const pre_caret_range = range.cloneRange()
  pre_caret_range.selectNodeContents(element)
  pre_caret_range.setEnd(range.endContainer, range.endOffset)
  return pre_caret_range.toString().length
}

const set_caret_position_for_div = (element: HTMLElement, position: number) => {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  let char_count = 0
  let found = false

  function find_text_node_and_offset(node: Node) {
    if (found) return
    if (node.nodeType === Node.TEXT_NODE) {
      const text_node = node as Text
      const next_char_count = char_count + text_node.length
      if (position >= char_count && position <= next_char_count) {
        range.setStart(node, position - char_count)
        range.collapse(true)
        found = true
      } else {
        char_count = next_char_count
      }
    } else {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).getAttribute('contenteditable') === 'false'
      ) {
        const text_len = node.textContent?.length ?? 0
        const next_char_count = char_count + text_len
        if (position >= char_count && position <= next_char_count) {
          range.setStartAfter(node)
          range.collapse(true)
          found = true
        } else {
          char_count = next_char_count
        }
        return // Do not iterate over children
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        find_text_node_and_offset(node.childNodes[i])
        if (found) break
      }
    }
  }

  find_text_node_and_offset(element)
  if (found) {
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}

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

    // Clear saved value on any input change
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
