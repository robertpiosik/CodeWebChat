import { RefObject, useState, useEffect } from 'react'
import { PromptFieldProps } from '../PromptField'
import {
  get_caret_position_from_div,
  set_caret_position_for_div
} from '../utils/caret'
import {
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos
} from '../utils/position-mapping'

const reconstruct_raw_value_from_node = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || ''
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement

    switch (el.dataset.type) {
      case 'file-keyword': {
        const path = el.dataset.path
        return path ? `\`${path}\`` : ''
      }
      case 'changes-keyword': {
        const branchName = el.dataset.branchName
        return branchName ? `#Changes:${branchName}` : ''
      }
      case 'saved-context-keyword': {
        const contextType = el.dataset.contextType
        const contextName = el.dataset.contextName
        return contextType && contextName
          ? `#SavedContext:${contextType} "${contextName}"`
          : ''
      }
      case 'selection-keyword':
        return '#Selection'
      case 'commit-keyword': {
        const repo_name = el.dataset.repoName
        const commit_hash = el.dataset.commitHash
        const commit_message = el.dataset.commitMessage
        return repo_name && commit_hash && commit_message !== undefined
          ? `#Commit:${repo_name}:${commit_hash} "${commit_message}"`
          : ''
      }
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

const set_caret_position_after_change = (
  input_ref: RefObject<HTMLDivElement>,
  new_raw_cursor_pos: number,
  new_value: string,
  context_file_paths: string[]
) => {
  setTimeout(() => {
    if (input_ref.current) {
      const display_pos = map_raw_pos_to_display_pos(
        new_raw_cursor_pos,
        new_value,
        context_file_paths
      )
      set_caret_position_for_div(input_ref.current, display_pos)
    }
  }, 0)
}

export const use_handlers = (
  props: PromptFieldProps,
  input_ref: RefObject<HTMLDivElement>
) => {
  const [history_index, set_history_index] = useState(-1)
  const [is_history_enabled, set_is_history_enabled] = useState(!props.value)
  const [undo_stack, set_undo_stack] = useState<string[]>([])
  const [redo_stack, set_redo_stack] = useState<string[]>([])

  useEffect(() => {
    set_is_history_enabled(history_index >= 0 || !props.value)
  }, [history_index, props.value])

  const update_value = (new_value: string, caret_pos?: number) => {
    if (new_value === props.value) return
    set_undo_stack((prev) => [...prev, props.value])
    set_redo_stack([])
    props.on_change(new_value)
    if (caret_pos !== undefined) {
      set_caret_position_after_change(
        input_ref,
        caret_pos,
        new_value,
        props.context_file_paths ?? []
      )
    }
  }

  const handle_clear = () => {
    update_value('')
    set_history_index(-1)
  }

  const handle_input_change = (e: React.FormEvent<HTMLDivElement>) => {
    const currentTarget = e.currentTarget
    const new_value = reconstruct_raw_value_from_node(currentTarget)

    if (new_value === props.value) {
      return
    }
    update_value(new_value)
    set_history_index(-1)

    const new_display_value = currentTarget.textContent ?? ''
    const caret_position = get_caret_position_from_div(currentTarget)
    const char_before_caret = new_display_value.charAt(caret_position - 1)

    if (char_before_caret === '@') {
      setTimeout(() => {
        props.on_at_sign_click()
      }, 150)
    } else if (char_before_caret === '#') {
      setTimeout(() => {
        props.on_hash_sign_click()
      }, 150)
    }
  }

  const handle_submit = (
    e:
      | React.KeyboardEvent<HTMLDivElement>
      | React.MouseEvent<HTMLButtonElement>,
    with_control?: boolean
  ) => {
    e.stopPropagation()
    const should_submit_with_control = with_control || e.ctrlKey || e.metaKey
    if (should_submit_with_control) {
      props.on_submit_with_control()
    } else {
      props.on_submit()
    }
    set_history_index(-1)
  }

  const handle_file_keyword_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    let start_of_path = -1
    const end_of_path = raw_pos - 1

    if (end_of_path >= 0 && props.value[end_of_path] === '`') {
      const text_before = props.value.substring(0, end_of_path)
      start_of_path = text_before.lastIndexOf('`')
    }

    if (
      start_of_path !== -1 &&
      end_of_path !== -1 &&
      start_of_path < end_of_path
    ) {
      const path_in_backticks = props.value.substring(
        start_of_path + 1,
        end_of_path
      )
      if (context_file_paths.includes(path_in_backticks)) {
        const new_value =
          props.value.substring(0, start_of_path) +
          props.value.substring(end_of_path + 1)
        const new_raw_cursor_pos = start_of_path
        update_value(new_value, new_raw_cursor_pos)
        return true
      }
    }
    return false
  }

  const handle_changes_keyword_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Changes:[^\s,;:!?]+$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        props.value.substring(0, start_of_match) +
        props.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      update_value(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_saved_context_keyword_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/
    )

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        props.value.substring(0, start_of_match) +
        props.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      update_value(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_selection_keyword_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Selection$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        props.value.substring(0, start_of_match) +
        props.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      update_value(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_commit_keyword_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Commit:[^:]+:[^\s"]+\s+"[^"]*"$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        props.value.substring(0, start_of_match) +
        props.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      update_value(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_keyword_deletion_by_backspace = (
    el: HTMLElement,
    display_pos: number
  ): boolean => {
    const context_file_paths = props.context_file_paths ?? []
    const raw_pos = map_display_pos_to_raw_pos(
      display_pos,
      props.value,
      context_file_paths
    )

    if (el.dataset.type === 'file-keyword') {
      return handle_file_keyword_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type === 'changes-keyword') {
      return handle_changes_keyword_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type === 'saved-context-keyword') {
      return handle_saved_context_keyword_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type === 'selection-keyword') {
      return handle_selection_keyword_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type === 'commit-keyword') {
      return handle_commit_keyword_deletion(raw_pos, context_file_paths)
    }

    return false
  }

  const handle_tab_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!input_ref.current) return

    const value = e.currentTarget.textContent ?? ''
    const selection_start = get_caret_position_from_div(input_ref.current)
    const text_before_cursor = value.substring(0, selection_start)

    if (selection_start === 0 || /\s$/.test(text_before_cursor)) {
      e.preventDefault()
      props.on_at_sign_click()
      return
    }

    e.preventDefault()
    const match = text_before_cursor.match(/(\S+)$/)
    if (match) {
      props.on_at_sign_click(match[1])
    }
  }

  const handle_backspace_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (
      !input_ref.current ||
      !selection ||
      selection.rangeCount === 0 ||
      !selection.isCollapsed
    ) {
      return
    }

    const range = selection.getRangeAt(0)
    let node_before_cursor: Node | null = null

    if (
      range.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset === 0
    ) {
      node_before_cursor = range.startContainer.previousSibling
    } else if (
      range.startContainer.nodeType === Node.ELEMENT_NODE &&
      range.startOffset > 0
    ) {
      node_before_cursor =
        range.startContainer.childNodes[range.startOffset - 1]
    }

    if (
      node_before_cursor &&
      node_before_cursor.nodeType === Node.ELEMENT_NODE
    ) {
      const el = node_before_cursor as HTMLElement
      if (
        el.dataset.type === 'file-keyword' ||
        el.dataset.type === 'changes-keyword' ||
        el.dataset.type === 'selection-keyword' ||
        el.dataset.type === 'saved-context-keyword' ||
        el.dataset.type === 'commit-keyword'
      ) {
        const display_pos = get_caret_position_from_div(input_ref.current)
        if (handle_keyword_deletion_by_backspace(el, display_pos)) {
          e.preventDefault()
        }
      }
    }
  }

  const handle_history_navigation = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    const active_history = props.chat_history

    if (active_history.length === 0) return

    e.preventDefault()

    const update_and_set_caret = (value: string) => {
      update_value(value, value.length)
    }

    if (e.key === 'ArrowUp') {
      if (history_index < active_history.length - 1) {
        const new_index = history_index + 1
        set_history_index(new_index)
        update_and_set_caret(active_history[new_index])
      }
    } else if (e.key === 'ArrowDown') {
      if (history_index > 0) {
        const new_index = history_index - 1
        set_history_index(new_index)
        update_and_set_caret(active_history[new_index])
      } else if (history_index === 0) {
        set_history_index(-1)
        update_and_set_caret('')
      }
    }
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key, shiftKey } = e
    if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() === 'z') {
      e.preventDefault()
      if (undo_stack.length > 0) {
        const prev_value = undo_stack[undo_stack.length - 1]
        set_undo_stack((prev) => prev.slice(0, -1))
        set_redo_stack((prev) => [...prev, props.value])
        props.on_change(prev_value)
        set_caret_position_after_change(
          input_ref,
          prev_value.length,
          prev_value,
          props.context_file_paths ?? []
        )
        set_history_index(-1)
      }
      return
    }
    if (
      ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'y') ||
      ((e.ctrlKey || e.metaKey) && shiftKey && key.toLowerCase() === 'z')
    ) {
      e.preventDefault()
      if (redo_stack.length > 0) {
        const next_value = redo_stack[redo_stack.length - 1]
        set_redo_stack((prev) => prev.slice(0, -1))
        set_undo_stack((prev) => [...prev, props.value])
        props.on_change(next_value)
        set_caret_position_after_change(
          input_ref,
          next_value.length,
          next_value,
          props.context_file_paths ?? []
        )
        set_history_index(-1)
      }
      return
    }
    if (key == 'Tab' && !shiftKey) {
      handle_tab_key(e)
      return
    }

    if (key == 'Backspace') {
      handle_backspace_key(e)
      return
    }

    if (key == 'Enter' && !shiftKey) {
      e.preventDefault()
      handle_submit(e)
      return
    }

    if ((key == 'ArrowUp' || key == 'ArrowDown') && is_history_enabled) {
      handle_history_navigation(e)
      return
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
