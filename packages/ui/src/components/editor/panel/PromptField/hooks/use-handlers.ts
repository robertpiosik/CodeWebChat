import { RefObject, useState, useEffect, useRef } from 'react'
import type { PromptFieldProps } from '../PromptField'
import {
  get_caret_position_from_div,
  set_caret_position_for_div
} from '../utils/caret'
import {
  map_display_pos_to_raw_pos,
  map_raw_pos_to_display_pos
} from '../utils/position-mapping'
import { search_paths } from '@shared/utils/search-paths'

type HistoryEntry = {
  value: string
  raw_caret_pos: number
}

const should_show_file_match_hint = (
  value: string,
  caret_position: number,
  context_file_paths: string[] | undefined
): boolean => {
  if (
    !value ||
    caret_position !== value.length ||
    value.endsWith(' ') ||
    value.endsWith('\n') ||
    !context_file_paths
  ) {
    return false
  }

  // Check if cursor is at the end of a shortened filename
  const text_before_cursor = value.substring(0, caret_position)
  const filename_match = text_before_cursor.match(
    /([^\s,;:!?`]*\.[^\s,;:!?`]+)$/
  )

  if (filename_match) {
    const filename = filename_match[1]
    const is_shortened_filename = context_file_paths.some(
      (path) => path.endsWith('/' + filename) || path === filename
    )
    if (is_shortened_filename) {
      return false
    }
  }

  const last_word = value.trim().split(/\s+/).pop()

  if (last_word && last_word.length >= 3) {
    const matching_paths = search_paths({
      paths: context_file_paths,
      search_value: last_word
    })
    return matching_paths.length === 1
  }

  return false
}

const reconstruct_raw_value_from_node = (node: Node): string => {
  if (node.nodeType == Node.TEXT_NODE) {
    return node.textContent || ''
  } else if ((node as HTMLElement).dataset?.type == 'ghost-text') {
    return ''
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement

    switch (el.dataset.type) {
      case 'file-keyword': {
        const path = el.dataset.path
        if (!path) return ''
        const filename = path.split('/').pop() || path
        if (el.textContent?.startsWith(filename)) {
          const extra = el.textContent.substring(filename.length)
          return `\`${path}\`${extra}`
        }
        break
      }
      case 'changes-keyword': {
        const branchName = el.dataset.branchName
        if (!branchName) return ''
        const expected_text = `Diff with ${branchName}`
        if (el.textContent?.startsWith(expected_text)) {
          const extra = el.textContent.substring(expected_text.length)
          return `#Changes:${branchName}${extra}`
        }
        break
      }
      case 'saved-context-keyword': {
        const contextType = el.dataset.contextType
        const contextName = el.dataset.contextName
        if (!contextType || !contextName) return ''
        const expected_text = `Context "${contextName}"`
        if (el.textContent?.startsWith(expected_text)) {
          const extra = el.textContent.substring(expected_text.length)
          return `#SavedContext:${contextType} "${contextName}"${extra}`
        }
        break
      }
      case 'selection-keyword': {
        const expected_text = 'Selection'
        if (el.textContent?.startsWith(expected_text)) {
          const extra = el.textContent.substring(expected_text.length)
          return `#Selection${extra}`
        }
        break
      }
      case 'commit-keyword': {
        const repo_name = el.dataset.repoName
        const commit_hash = el.dataset.commitHash
        const commit_message = el.dataset.commitMessage
        if (!repo_name || !commit_hash || commit_message === undefined) {
          return ''
        }
        const short_hash = commit_hash.substring(0, 7)
        if (el.textContent?.startsWith(short_hash)) {
          const extra = el.textContent.substring(short_hash.length)
          return `#Commit:${repo_name}:${commit_hash} "${commit_message}"${extra}`
        }
        break
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
  input_ref: RefObject<HTMLDivElement>,
  ghost_text: string,
  on_accept_ghost_text: () => void
) => {
  const [history_index, set_history_index] = useState(-1)
  const [is_history_enabled, set_is_history_enabled] = useState(!props.value)
  const [undo_stack, set_undo_stack] = useState<HistoryEntry[]>([])
  const [redo_stack, set_redo_stack] = useState<HistoryEntry[]>([])
  const raw_caret_pos_ref = useRef(0)

  useEffect(() => {
    const on_selection_change = () => {
      if (document.activeElement === input_ref.current && input_ref.current) {
        const pos = get_caret_position_from_div(input_ref.current)
        const raw_pos = map_display_pos_to_raw_pos(
          pos,
          props.value,
          props.context_file_paths ?? []
        )
        raw_caret_pos_ref.current = raw_pos
      }
    }
    document.addEventListener('selectionchange', on_selection_change)
    return () =>
      document.removeEventListener('selectionchange', on_selection_change)
  }, [props.value, props.context_file_paths, input_ref])

  useEffect(() => {
    set_is_history_enabled(history_index >= 0 || !props.value)
  }, [history_index, props.value])

  const update_value = (new_value: string, caret_pos?: number) => {
    if (new_value === props.value) return
    set_undo_stack((prev) => [
      ...prev,
      { value: props.value, raw_caret_pos: raw_caret_pos_ref.current }
    ])
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

  const apply_keyword_deletion = (start_pos: number, end_pos: number) => {
    let leading_part = props.value.substring(0, start_pos)
    let trailing_part = props.value.substring(end_pos)

    // Handle spacing
    if (leading_part.endsWith(' ')) {
      leading_part = leading_part.slice(0, -1)
    } else if (trailing_part.startsWith(' ')) {
      trailing_part = trailing_part.substring(1)
    }

    const new_value = leading_part + trailing_part
    const new_raw_cursor_pos = leading_part.length
    update_value(new_value, new_raw_cursor_pos)
  }

  const handle_keyword_deletion_by_click = (keyword_element: HTMLElement) => {
    const keyword_type = keyword_element.dataset.type
    switch (keyword_type) {
      case 'file-keyword': {
        const file_path = keyword_element.dataset.path
        if (!file_path || !props.context_file_paths?.includes(file_path)) return

        const search_pattern = `\`${file_path}\``
        const start_index = props.value.indexOf(search_pattern)

        if (start_index !== -1) {
          apply_keyword_deletion(
            start_index,
            start_index + search_pattern.length
          )
        }
        break
      }
      case 'changes-keyword': {
        const branch_name = keyword_element.dataset.branchName
        if (!branch_name) return

        const search_pattern = `#Changes:${branch_name}`
        const start_index = props.value.indexOf(search_pattern)

        if (start_index !== -1) {
          apply_keyword_deletion(
            start_index,
            start_index + search_pattern.length
          )
        }
        break
      }
      case 'saved-context-keyword': {
        const context_type = keyword_element.dataset.contextType
        const context_name = keyword_element.dataset.contextName
        if (!context_type || !context_name) return

        const search_pattern = `#SavedContext:${context_type} "${context_name}"`
        const start_index = props.value.indexOf(search_pattern)

        if (start_index !== -1) {
          apply_keyword_deletion(
            start_index,
            start_index + search_pattern.length
          )
        }
        break
      }
      case 'selection-keyword': {
        const search_pattern = '#Selection'
        const start_index = props.value.indexOf(search_pattern)

        if (start_index !== -1) {
          apply_keyword_deletion(
            start_index,
            start_index + search_pattern.length
          )
        }
        break
      }
      case 'commit-keyword': {
        const repo_name = keyword_element.dataset.repoName
        const commit_hash = keyword_element.dataset.commitHash
        const commit_message = keyword_element.dataset.commitMessage
        if (!repo_name || !commit_hash || commit_message === undefined) return

        const search_pattern = `#Commit:${repo_name}:${commit_hash} "${commit_message}"`
        const start_index = props.value.indexOf(search_pattern)

        if (start_index !== -1) {
          apply_keyword_deletion(
            start_index,
            start_index + search_pattern.length
          )
        }
        break
      }
    }
  }

  const handle_copy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
      return

    const range = selection.getRangeAt(0)
    const input_element = input_ref.current
    if (!input_element || !input_element.contains(range.startContainer)) return

    e.preventDefault()

    const pre_selection_range = document.createRange()
    pre_selection_range.selectNodeContents(input_element)
    pre_selection_range.setEnd(range.startContainer, range.startOffset)
    const display_start = pre_selection_range.toString().length

    pre_selection_range.setEnd(range.endContainer, range.endOffset)
    const display_end = pre_selection_range.toString().length

    const raw_start = map_display_pos_to_raw_pos(
      display_start,
      props.value,
      props.context_file_paths ?? []
    )
    const raw_end = map_display_pos_to_raw_pos(
      display_end,
      props.value,
      props.context_file_paths ?? []
    )

    const raw_text_slice = props.value.substring(raw_start, raw_end)
    e.clipboardData.setData('text/plain', raw_text_slice)
  }

  const handle_input_click = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const icon_element = target.closest('[data-role="keyword-icon"]')
    const text_element = target.closest('[data-role="keyword-text"]')

    if (icon_element) {
      e.preventDefault()
      e.stopPropagation()
      const keyword_element = (
        icon_element as HTMLElement
      ).closest<HTMLElement>('[data-type]')
      if (keyword_element) {
        handle_keyword_deletion_by_click(keyword_element)
      }
    } else if (text_element) {
      // Clicking on file name text should open the file
      e.preventDefault()
      e.stopPropagation()

      const file_keyword_element = text_element.closest<HTMLElement>(
        '[data-type="file-keyword"]'
      )
      if (file_keyword_element) {
        const file_path = file_keyword_element.getAttribute('title')
        if (file_path && props.on_go_to_file) {
          props.on_go_to_file(file_path)
        }
      }

      // Keep focus on input
      if (input_ref.current) {
        input_ref.current.focus()
      }
    }
  }

  const handle_clear = () => {
    update_value('')
    set_history_index(-1)
  }

  const handle_input_change = (e: React.FormEvent<HTMLDivElement>) => {
    const currentTarget = e.currentTarget
    const new_raw_value = reconstruct_raw_value_from_node(currentTarget)

    if (new_raw_value === props.value) {
      return
    }

    const new_display_value = currentTarget.textContent ?? ''
    const caret_position = get_caret_position_from_div(currentTarget)
    const char_before_caret = new_display_value.charAt(caret_position - 1)

    if (char_before_caret == '\\') {
      const display_value_before_backslash = new_display_value.substring(
        0,
        caret_position - 1
      )
      const show_hint = should_show_file_match_hint(
        display_value_before_backslash,
        caret_position - 1,
        props.context_file_paths
      )

      if (show_hint) {
        const last_word = display_value_before_backslash.trim().split(/\s+/).pop()
        if (last_word) {
          const matching_paths = search_paths({
            paths: props.context_file_paths ?? [],
            search_value: last_word
          })
          if (matching_paths.length === 1) {
            const matched_path = matching_paths[0]
            const old_raw_value = props.value

            const last_word_in_raw_index = old_raw_value.lastIndexOf(last_word)
            if (
              last_word_in_raw_index !== -1 &&
              old_raw_value.endsWith(last_word)
            ) {
              const value_before = old_raw_value.substring(
                0,
                last_word_in_raw_index
              )
              const final_new_value = `${value_before}\`${matched_path}\` `
              update_value(final_new_value, final_new_value.length)
              set_history_index(-1)
              return
            }
          }
        }
      }
    }

    update_value(new_raw_value)
    set_history_index(-1)

    if (char_before_caret == '@') {
      const is_at_start = caret_position == 1
      let is_after_non_word_char = false
      if (caret_position > 1) {
        const char_before_at = new_display_value.charAt(caret_position - 2)
        // Check if the character before '@' is not a word character (a-z, A-Z, 0-9, _)
        is_after_non_word_char = !/\w/.test(char_before_at)
      }

      if (is_at_start || is_after_non_word_char) {
          props.on_at_sign_click()
      }
    } else if (char_before_caret == '#') {
        props.on_hash_sign_click()
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
    e.preventDefault()
    props.on_at_sign_click()
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
    const { startContainer, startOffset } = range
    let node_before_cursor: Node | null = null

    if (
      startContainer.nodeType == Node.TEXT_NODE &&
      startOffset == 0
    ) {
      node_before_cursor = startContainer.previousSibling
    } else if (
      startContainer.nodeType == Node.ELEMENT_NODE &&
      startOffset > 0
    ) {
      node_before_cursor = startContainer.childNodes[startOffset - 1]
    } else if (
      startContainer.nodeType == Node.TEXT_NODE &&
      startOffset == startContainer.textContent?.length
    ) {
      let parent = startContainer.parentElement
      while (parent && parent !== input_ref.current) {
        if (
          parent.dataset.type == 'file-keyword' ||
          parent.dataset.type == 'changes-keyword' ||
          parent.dataset.type == 'selection-keyword' ||
          parent.dataset.type == 'saved-context-keyword' ||
          parent.dataset.type == 'commit-keyword'
        ) {
          const rangeAfter = document.createRange()
          rangeAfter.selectNodeContents(parent)
          rangeAfter.setStart(startContainer, startOffset)
          if (rangeAfter.toString().trim() == '') {
            node_before_cursor = parent
            break
          }
        }
        parent = parent.parentElement
      }
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
    const { key, shiftKey, altKey } = e

    // Handle arrow-right when ghost text is present
    if (key === 'ArrowRight' && ghost_text && !shiftKey) {
      const selection = window.getSelection()
      if (
        selection &&
        selection.rangeCount > 0 &&
        selection.isCollapsed &&
        input_ref.current
      ) {
        const range = selection.getRangeAt(0)
        const ghost_node = input_ref.current.querySelector(
          'span[data-type="ghost-text"]'
        )

        // Check if caret is right before the ghost text node
        if (ghost_node) {
          const { startContainer, startOffset } = range

          // Check if we're at the position just before ghost text
          let is_before_ghost = false

          if (startContainer === ghost_node.previousSibling) {
            // Caret is at the end of the text node before ghost
            if (startContainer.nodeType === Node.TEXT_NODE) {
              is_before_ghost = startOffset === startContainer.textContent?.length
            }
          } else if (startContainer === ghost_node.parentNode) {
            // Caret is in the parent, check if it's right before ghost node
            const ghost_index = Array.from(startContainer.childNodes).indexOf(ghost_node as ChildNode)
            is_before_ghost = startOffset === ghost_index
          }

          if (is_before_ghost) {
            e.preventDefault()
            on_accept_ghost_text()
            return
          }
        }
      }
    }

    if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() === 'z') {
      e.preventDefault()
      if (undo_stack.length > 0) {
        const prev_entry = undo_stack[undo_stack.length - 1]
        set_undo_stack((prev) => prev.slice(0, -1))
        set_redo_stack((prev) => [
          ...prev,
          { value: props.value, raw_caret_pos: raw_caret_pos_ref.current }
        ])
        props.on_change(prev_entry.value)
        set_caret_position_after_change(
          input_ref,
          prev_entry.raw_caret_pos,
          prev_entry.value,
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
        const next_entry = redo_stack[redo_stack.length - 1]
        set_redo_stack((prev) => prev.slice(0, -1))
        set_undo_stack((prev) => [
          ...prev,
          { value: props.value, raw_caret_pos: raw_caret_pos_ref.current }
        ])
        props.on_change(next_entry.value)
        set_caret_position_after_change(
          input_ref,
          next_entry.raw_caret_pos,
          next_entry.value,
          props.context_file_paths ?? []
        )
        set_history_index(-1)
      }
      return
    }
    if (key == 'Tab' && !shiftKey) {
      if (ghost_text) {
        e.preventDefault()
        on_accept_ghost_text()
        return
      }
      handle_tab_key(e)
      return
    }

    if (key == 'Backspace') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const raw_pos = raw_caret_pos_ref.current
        if (raw_pos === 0) return

        const value = props.value
        let i = raw_pos - 1

        // First, skip any whitespace characters before the cursor.
        while (i >= 0 && /\s/.test(value[i])) {
          i--
        }

        // Then, delete the word or symbol group before that.
        if (i >= 0) {
          const is_word_char = /\w/.test(value[i])
          while (i >= 0) {
            const current_is_word = /\w/.test(value[i])
            if (/\s/.test(value[i]) || current_is_word !== is_word_char) {
              break
            }
            i--
          }
        }

        const new_start_pos = i + 1
        const new_value =
          value.substring(0, new_start_pos) + value.substring(raw_pos)
        update_value(new_value, new_start_pos)
        return
      }
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

    if (key == 'Escape') {
      if (input_ref.current) {
        input_ref.current.blur()
      }
      return
    }
  }

  return {
    handle_input_change,
    handle_submit,
    handle_key_down,
    is_history_enabled,
    handle_clear,
    handle_copy,
    handle_input_click
  }
}
