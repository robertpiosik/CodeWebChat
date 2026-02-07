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

type HistoryEntry = {
  value: string
  raw_caret_pos: number
}

const get_symbol_ranges = (
  text: string,
  context_file_paths: string[]
): { start: number; end: number }[] => {
  const ranges: { start: number; end: number }[] = []
  // This regex is a combination of all symbol types
  const regex =
    /`([^\s`]*\.[^\s`]+)`|(#Changes\([^)]+\))|(#Selection)|(#SavedContext\((?:WorkspaceState|JSON) "(?:\\.|[^"\\])*"\))|(#(?:Commit|ContextAtCommit)\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\))|(<fragment path="[^"]+"(?: [^>]+)?>[\s\S]*?<\/fragment>)|(#Skill\([^)]+\))|(#Image\([a-fA-F0-9]+\))|(#Document\([a-fA-F0-9]+:\d+\))|(#Website\([^)]+\))/g

  let match
  while ((match = regex.exec(text)) !== null) {
    const file_path = match[1]

    if (file_path) {
      // Only treat file paths as symbols if they are in the context
      if (context_file_paths.includes(file_path)) {
        ranges.push({ start: match.index, end: match.index + match[0].length })
      }
    } else {
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
  }
  return ranges
}

const reconstruct_raw_value_from_node = (node: Node): string => {
  if (node.nodeType == Node.TEXT_NODE) {
    return node.textContent || ''
  } else if ((node as HTMLElement).dataset?.type == 'ghost-text') {
    return ''
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement
    let inner_content = ''
    for (const child of Array.from(el.childNodes)) {
      inner_content += reconstruct_raw_value_from_node(child)
    }

    if (el.dataset.type == 'file-symbol') {
      const path = el.dataset.path
      if (!path) return ''
      const filename = path.split('/').pop() || path
      const index = inner_content.indexOf(filename)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + filename.length)
        return `${prefix}\`${path}\`${suffix}`
      }
    } else if (el.dataset.type == 'changes-symbol') {
      const branchName = el.dataset.branchName
      if (!branchName) return ''
      const expected_text = `Diff with ${branchName}`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Changes(${branchName})${suffix}`
      }
    } else if (el.dataset.type == 'saved-context-symbol') {
      const contextType = el.dataset.contextType
      const contextName = el.dataset.contextName
      if (!contextType || !contextName) return ''
      const expected_text = `Context "${contextName}`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#SavedContext(${contextType} "${contextName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")${suffix}`
      }
    } else if (el.dataset.type == 'selection-symbol') {
      const expected_text = 'Selection'
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Selection${suffix}`
      }
    } else if (el.dataset.type == 'commit-symbol') {
      const repo_name = el.dataset.repoName
      const commit_hash = el.dataset.commitHash
      const commit_message = el.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) {
        return ''
      }
      const short_hash = commit_hash.substring(0, 7)
      const index = inner_content.indexOf(short_hash)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + short_hash.length)
        return `${prefix}#Commit(${repo_name}:${commit_hash} "${commit_message.replace(
          /"/g,
          '\\"'
        )}")${suffix}`
      }
    } else if (el.dataset.type == 'contextatcommit-symbol') {
      const repo_name = el.dataset.repoName
      const commit_hash = el.dataset.commitHash
      const commit_message = el.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) {
        return ''
      }
      const short_hash = commit_hash.substring(0, 7)
      const index = inner_content.indexOf(short_hash)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + short_hash.length)
        return `${prefix}#ContextAtCommit(${repo_name}:${commit_hash} "${commit_message.replace(
          /"/g,
          '\\"'
        )}")${suffix}`
      }
    } else if (el.dataset.type == 'pasted-lines-symbol') {
      const path = el.dataset.path
      const content = el.dataset.content
      const start = el.dataset.start
      const end = el.dataset.end
      if (!path || content === undefined) return ''

      let attributes = `path="${path}"`
      if (start) attributes += ` start="${start}"`
      if (end) attributes += ` end="${end}"`

      const is_multiline = content.includes('\n')
      const formatted_content = is_multiline
        ? `\n<![CDATA[\n${content}\n]]>\n`
        : `<![CDATA[${content}]]>`
      const line_count = is_multiline ? content.split('\n').length : 1
      const lines_text = line_count === 1 ? 'line' : 'lines'
      const label = `Pasted ${line_count} ${lines_text}`
      const index = inner_content.indexOf(label)

      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + label.length)
        return `${prefix}<fragment ${attributes}>${formatted_content}</fragment>${suffix}`
      }

      return `<fragment ${attributes}>${formatted_content}</fragment>`
    } else if (el.dataset.type == 'skill-symbol') {
      const agent = el.dataset.agent
      const repo = el.dataset.repo
      const skillName = el.dataset.skillName
      if (!agent || !repo || !skillName) return ''

      const index = inner_content.indexOf(skillName)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + skillName.length)
        return `${prefix}#Skill(${agent}:${repo}:${skillName})${suffix}`
      }
    } else if (el.dataset.type == 'image-symbol') {
      const hash = el.dataset.hash
      if (!hash) return ''

      const expected_text = `Image`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Image(${hash})${suffix}`
      }
    } else if (el.dataset.type == 'document-symbol') {
      const hash = el.dataset.hash
      const token_count = el.dataset.tokenCount
      if (!hash || !token_count) return ''

      const expected_text = `Pasted ${token_count} tokens`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Document(${hash}:${token_count})${suffix}`
      }
    } else if (el.dataset.type == 'website-symbol') {
      const url = el.dataset.url
      if (!url) return ''

      let expected_text = 'Website'
      try {
        expected_text = new URL(url).hostname
        if (expected_text.startsWith('www.')) {
          expected_text = expected_text.slice(4)
        }
      } catch {}

      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Website(${url})${suffix}`
      }
    }

    return inner_content
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
  const has_modified_current_entry_ref = useRef(false)
  const is_shift_pressed_ref = useRef(false)

  useEffect(() => {
    const handle_key_down = (e: KeyboardEvent) => {
      if (e.key == 'Shift') is_shift_pressed_ref.current = true
    }
    const handle_key_up = (e: KeyboardEvent) => {
      if (e.key == 'Shift') is_shift_pressed_ref.current = false
    }
    const handle_blur = () => {
      is_shift_pressed_ref.current = false
    }
    window.addEventListener('keydown', handle_key_down)
    window.addEventListener('keyup', handle_key_up)
    window.addEventListener('blur', handle_blur)

    return () => {
      window.removeEventListener('keydown', handle_key_down)
      window.removeEventListener('keyup', handle_key_up)
      window.removeEventListener('blur', handle_blur)
    }
  }, [])

  useEffect(() => {
    if (!props.value) {
      has_modified_current_entry_ref.current = false
      set_is_history_enabled(true)
    }

    const on_selection_change = () => {
      if (document.activeElement === input_ref.current && input_ref.current) {
        const selection = window.getSelection()
        const pos = get_caret_position_from_div(input_ref.current)
        const raw_pos = map_display_pos_to_raw_pos(
          pos,
          props.value,
          props.context_file_paths ?? []
        )
        raw_caret_pos_ref.current = raw_pos

        const is_at_end =
          raw_pos == props.value.length && !!selection?.isCollapsed

        // Only enable history if at end AND haven't modified the current entry
        const is_history_check_enabled =
          is_at_end && !has_modified_current_entry_ref.current
        set_is_history_enabled(is_history_check_enabled)
      }
    }
    document.addEventListener('selectionchange', on_selection_change)
    on_selection_change()
    return () =>
      document.removeEventListener('selectionchange', on_selection_change)
  }, [props.value, props.context_file_paths, input_ref])

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

  const apply_symbol_deletion = (start_pos: number, end_pos: number) => {
    let leading_part = props.value.substring(0, start_pos)
    let trailing_part = props.value.substring(end_pos)

    if (trailing_part.startsWith(' ')) {
      trailing_part = trailing_part.substring(1)
    } else if (leading_part.endsWith(' ')) {
      leading_part = leading_part.slice(0, -1)
    }

    const new_value = leading_part + trailing_part
    const new_raw_cursor_pos = leading_part.length
    has_modified_current_entry_ref.current = new_value != ''
    update_value(new_value, new_raw_cursor_pos)
  }

  const handle_symbol_deletion_by_click = (symbol_element: HTMLElement) => {
    const symbol_type = symbol_element.dataset.type
    if (symbol_type == 'file-symbol') {
      const file_path = symbol_element.dataset.path
      if (!file_path || !props.context_file_paths?.includes(file_path)) return

      const search_pattern = `\`${file_path}\``
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'changes-symbol') {
      const branch_name = symbol_element.dataset.branchName
      if (!branch_name) return

      const search_pattern = `#Changes(${branch_name})`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'saved-context-symbol') {
      const context_type = symbol_element.dataset.contextType
      const context_name = symbol_element.dataset.contextName
      if (!context_type || !context_name) return

      const search_pattern = `#SavedContext(${context_type} "${context_name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'selection-symbol') {
      const search_pattern = '#Selection'
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'commit-symbol') {
      const repo_name = symbol_element.dataset.repoName
      const commit_hash = symbol_element.dataset.commitHash
      const commit_message = symbol_element.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) return

      const search_pattern = `#Commit(${repo_name}:${commit_hash} "${commit_message.replace(
        /"/g,
        '\\\\\"'
      )}")`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'contextatcommit-symbol') {
      const repo_name = symbol_element.dataset.repoName
      const commit_hash = symbol_element.dataset.commitHash
      const commit_message = symbol_element.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) return

      const search_pattern = `#ContextAtCommit(${repo_name}:${commit_hash} "${commit_message.replace(
        /"/g,
        '\\\\\"'
      )}")`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'skill-symbol') {
      const agent = symbol_element.dataset.agent
      const repo = symbol_element.dataset.repo
      const skillName = symbol_element.dataset.skillName
      if (!agent || !repo || !skillName) return

      const search_pattern = `#Skill(${agent}:${repo}:${skillName})`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'pasted-lines-symbol') {
      const path = symbol_element.dataset.path
      const content = symbol_element.dataset.content
      const start = symbol_element.dataset.start
      const end = symbol_element.dataset.end
      if (!path || content === undefined) return

      let attributes = `path="${path}"`
      if (start) attributes += ` start="${start}"`
      if (end) attributes += ` end="${end}"`

      const is_multiline = content.includes('\n')
      const formatted_content = is_multiline
        ? `\n<![CDATA[\n${content}\n]]>\n`
        : `<![CDATA[${content}]]>`

      const search_pattern_new = `<fragment ${attributes}>${formatted_content}</fragment>`
      const search_pattern_old = `<fragment ${attributes}>\n${content}\n</fragment>`

      let search_pattern = search_pattern_new
      let start_index = props.value.indexOf(search_pattern)

      if (start_index == -1) {
        search_pattern = search_pattern_old
        start_index = props.value.indexOf(search_pattern)
      }

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'image-symbol') {
      const hash = symbol_element.dataset.hash
      if (!hash) return

      const search_pattern = `#Image(${hash})`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'document-symbol') {
      const hash = symbol_element.dataset.hash
      const token_count = symbol_element.dataset.tokenCount
      if (!hash || !token_count) return

      const search_pattern = `#Document(${hash}:${token_count})`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'website-symbol') {
      const url = symbol_element.dataset.url
      if (!url) return

      const search_pattern = `#Website(${url})`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'url-symbol') {
      const url = symbol_element.dataset.url
      if (!url) return

      const search_pattern = `#Url(${url})`
      const start_index = props.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    }
  }

  const handle_copy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount == 0 || selection.isCollapsed) return

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

  const handle_cut = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount == 0 || selection.isCollapsed) return

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

    const new_value =
      props.value.substring(0, raw_start) + props.value.substring(raw_end)

    has_modified_current_entry_ref.current = true
    update_value(new_value, raw_start)
  }

  const perform_paste = (text: string) => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !input_ref.current) return
    const range = selection.getRangeAt(0)
    const input_element = input_ref.current

    if (!input_element.contains(range.startContainer)) return

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

    let text_to_insert = text
    let caret_offset_adjustment = 0

    if (
      !is_shift_pressed_ref.current &&
      props.current_selection &&
      text == props.current_selection.text &&
      props.currently_open_file_path
    ) {
      const { start_line, start_col, end_line, end_col } =
        props.current_selection
      const is_multiline = text.includes('\n')
      const formatted_text = is_multiline
        ? `\n<![CDATA[\n${text}\n]]>\n`
        : `<![CDATA[${text}]]>`
      text_to_insert = `<fragment path="${props.currently_open_file_path}" start="${start_line}:${start_col}" end="${end_line}:${end_col}">${formatted_text}</fragment>`
    }

    const new_value =
      props.value.substring(0, raw_start) +
      text_to_insert +
      props.value.substring(raw_end)
    const new_caret_pos =
      raw_start + text_to_insert.length + caret_offset_adjustment

    has_modified_current_entry_ref.current = true
    update_value(new_value, new_caret_pos)
  }

  const handle_paste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0]
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64 = event.target.result.toString()
            // Remove data:image/png;base64, prefix
            const commaIndex = base64.indexOf(',')
            if (commaIndex != -1) {
              const rawBase64 = base64.substring(commaIndex + 1)
              props.on_paste_image(rawBase64)
            }
          }
        }
        reader.readAsDataURL(file)
        return
      }
    }

    const text = e.clipboardData.getData('text/plain')

    if (
      !is_shift_pressed_ref.current &&
      /^https?:\/\/[^\s]+$/.test(text.trim())
    ) {
      props.on_paste_url(text.trim())
      return
    }

    if (!is_shift_pressed_ref.current && text.length > 1000) {
      props.on_paste_document(text)
      return
    }

    perform_paste(text)
  }

  const handle_input_click = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const icon_element = target.closest('[data-role="symbol-icon"]')
    const text_element = target.closest('[data-role="symbol-text"]')
    const clear_button = target.closest('[data-role="clear-button"]')

    if (icon_element) {
      e.preventDefault()
      e.stopPropagation()
      const symbol_element = (icon_element as HTMLElement).closest<HTMLElement>(
        '[data-type]'
      )
      if (symbol_element) {
        handle_symbol_deletion_by_click(symbol_element)
      }
    } else if (text_element) {
      e.preventDefault()
      e.stopPropagation()

      const file_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="file-symbol"]'
      )
      if (file_symbol_element) {
        const file_path = file_symbol_element.getAttribute('title')
        if (file_path) {
          props.on_go_to_file(file_path)
        }
      }

      const pasted_lines_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="pasted-lines-symbol"]'
      )
      if (pasted_lines_symbol_element) {
        const path = pasted_lines_symbol_element.dataset.path
        const start = pasted_lines_symbol_element.dataset.start
        const end = pasted_lines_symbol_element.dataset.end
        if (path) {
          props.on_pasted_lines_click(path, start, end)
        }
      }

      const skill_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="skill-symbol"]'
      )
      if (skill_symbol_element) {
        const repo = skill_symbol_element.dataset.repo
        const skill_name = skill_symbol_element.dataset.skillName

        if (repo && repo != 'local' && skill_name) {
          const parts = repo.split(':')
          if (parts.length == 2) {
            const [user, repo_name] = parts
            const url = `https://skills.sh/${user}/${repo_name}/${skill_name}`
            props.on_open_url(url)
          }
        }
      }

      const image_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="image-symbol"]'
      )
      if (image_symbol_element) {
        const hash = image_symbol_element.dataset.hash
        if (hash) {
          props.on_open_image(hash)
        }
      }

      const document_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="document-symbol"]'
      )
      if (document_symbol_element) {
        const hash = document_symbol_element.dataset.hash
        if (hash) {
          props.on_open_document(hash)
        }
      }

      const website_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="website-symbol"]'
      )
      if (website_symbol_element) {
        const url = website_symbol_element.dataset.url
        if (url) {
          props.on_open_url(url)
        }
      }

      if (input_ref.current) {
        input_ref.current.focus()
      }
    } else if (clear_button) {
      e.preventDefault()
      e.stopPropagation()
      handle_clear()
      if (input_ref.current) {
        input_ref.current.focus()
      }
    }
  }

  const handle_clear = () => {
    has_modified_current_entry_ref.current = false
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

    has_modified_current_entry_ref.current = new_raw_value != ''
    update_value(new_raw_value)

    const native_event = e.nativeEvent as unknown as { inputType?: string }
    if (native_event.inputType?.startsWith('delete')) {
      set_history_index(-1)
      return
    }

    if (char_before_caret == '@') {
      let should_trigger = true
      if (caret_position > 1) {
        const char_before_at = new_display_value.charAt(caret_position - 2)
        if (char_before_at == '@') {
          should_trigger = false
        }
      }

      if (should_trigger) {
        props.on_at_sign_click()
      }
    } else if (char_before_caret == '#') {
      const is_at_start = caret_position == 1
      let is_after_whitespace = false
      if (caret_position > 1) {
        const char_before_hash = new_display_value.charAt(caret_position - 2)
        is_after_whitespace = /\s/.test(char_before_hash)
      }

      if (is_at_start || is_after_whitespace) {
        props.on_hash_sign_click()
      }
    }

    set_history_index(-1)
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

  const handle_file_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    let start_of_path = -1
    const end_of_path = raw_pos - 1

    if (end_of_path >= 0 && props.value[end_of_path] == '`') {
      const text_before = props.value.substring(0, end_of_path)
      start_of_path = text_before.lastIndexOf('`')
    }

    if (
      start_of_path != -1 &&
      end_of_path != -1 &&
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

  const handle_changes_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Changes\([^)]+\)$/)

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

  const handle_saved_context_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#SavedContext\((?:WorkspaceState|JSON) "(?:\\.|[^"\\])*"\)$/
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

  const handle_selection_symbol_deletion = (
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

  const handle_commit_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#(?:Commit|ContextAtCommit)\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\)$/
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

  const handle_skill_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Skill\([^)]+\)$/)

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

  const handle_pasted_lines_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)

    const regex = /<fragment path="[^"]+"(?: [^>]+)?>[\s\S]*?<\/fragment>/g
    let match
    let last_match: RegExpExecArray | null = null

    while ((match = regex.exec(text_before_cursor)) !== null) {
      last_match = match
    }

    if (
      last_match &&
      last_match.index + last_match[0].length === text_before_cursor.length
    ) {
      const start_of_match = last_match.index
      const new_value =
        props.value.substring(0, start_of_match) +
        props.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      update_value(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_image_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Image\(([a-fA-F0-9]+)\)$/)

    if (match) {
      const hash = match[1]
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

  const handle_document_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#Document\(([a-fA-F0-9]+)(?: (\d+))?\)$/
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

  const handle_website_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = props.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Website\(([^)]+)\)$/)

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

  const handle_symbol_deletion_by_backspace = (
    el: HTMLElement,
    display_pos: number
  ): boolean => {
    const context_file_paths = props.context_file_paths ?? []
    const raw_pos = map_display_pos_to_raw_pos(
      display_pos,
      props.value,
      context_file_paths
    )

    if (el.dataset.type == 'file-symbol') {
      return handle_file_symbol_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type == 'changes-symbol') {
      return handle_changes_symbol_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type == 'saved-context-symbol') {
      return handle_saved_context_symbol_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type == 'selection-symbol') {
      return handle_selection_symbol_deletion(raw_pos, context_file_paths)
    }

    if (
      el.dataset.type == 'commit-symbol' ||
      el.dataset.type == 'contextatcommit-symbol'
    ) {
      return handle_commit_symbol_deletion(raw_pos, context_file_paths)
    }

    if (el.dataset.type == 'skill-symbol') {
      return handle_skill_symbol_deletion(raw_pos)
    }

    if (el.dataset.type == 'pasted-lines-symbol') {
      return handle_pasted_lines_symbol_deletion(raw_pos)
    }

    if (el.dataset.type == 'image-symbol') {
      return handle_image_symbol_deletion(raw_pos)
    }

    if (el.dataset.type == 'document-symbol') {
      return handle_document_symbol_deletion(raw_pos)
    }

    if (el.dataset.type == 'website-symbol') {
      return handle_website_symbol_deletion(raw_pos)
    }

    return false
  }

  const handle_backspace_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (
      !input_ref.current ||
      !selection ||
      selection.rangeCount == 0 ||
      !selection.isCollapsed
    ) {
      return
    }

    const range = selection.getRangeAt(0)
    const { startContainer, startOffset } = range
    let node_before_cursor: Node | null = null

    if (startContainer.nodeType == Node.TEXT_NODE && startOffset == 0) {
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
          parent.dataset.type == 'file-symbol' ||
          parent.dataset.type == 'changes-symbol' ||
          parent.dataset.type == 'selection-symbol' ||
          parent.dataset.type == 'saved-context-symbol' ||
          parent.dataset.type == 'commit-symbol' ||
          parent.dataset.type == 'contextatcommit-symbol' ||
          parent.dataset.type == 'pasted-lines-symbol' ||
          parent.dataset.type == 'skill-symbol' ||
          parent.dataset.type == 'image-symbol' ||
          parent.dataset.type == 'document-symbol' ||
          parent.dataset.type == 'website-symbol'
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
        el.dataset.type == 'file-symbol' ||
        el.dataset.type == 'changes-symbol' ||
        el.dataset.type == 'selection-symbol' ||
        el.dataset.type == 'saved-context-symbol' ||
        el.dataset.type == 'commit-symbol' ||
        el.dataset.type == 'contextatcommit-symbol' ||
        el.dataset.type == 'pasted-lines-symbol' ||
        el.dataset.type == 'skill-symbol' ||
        el.dataset.type == 'image-symbol' ||
        el.dataset.type == 'document-symbol' ||
        el.dataset.type == 'website-symbol'
      ) {
        const display_pos = get_caret_position_from_div(input_ref.current)
        if (handle_symbol_deletion_by_backspace(el, display_pos)) {
          e.preventDefault()
        }
      }
    }
  }

  const handle_history_navigation = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    const active_history = props.chat_history

    if (active_history.length == 0) return

    e.preventDefault()

    const update_and_set_caret = (value: string) => {
      // Reset the modification flag when navigating history
      has_modified_current_entry_ref.current = false
      update_value(value, value.length)
    }

    if (e.key == 'ArrowUp') {
      if (history_index < active_history.length - 1) {
        const new_index = history_index + 1
        set_history_index(new_index)
        update_and_set_caret(active_history[new_index])
      }
    } else if (e.key == 'ArrowDown') {
      if (history_index > 0) {
        const new_index = history_index - 1
        set_history_index(new_index)
        update_and_set_caret(active_history[new_index])
      } else if (history_index == 0) {
        set_history_index(-1)
        update_and_set_caret('')
      }
    }
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { key, shiftKey } = e

    if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() == 'c') {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount == 0 || selection.isCollapsed) {
        e.preventDefault()
        props.on_copy()
        return
      }
    }

    if ((e.ctrlKey || e.metaKey) && shiftKey && key.toLowerCase() == 'v') {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        perform_paste(text)
      })
      return
    }

    if ((e.ctrlKey || e.metaKey) && !shiftKey) {
      if (key == 'ArrowLeft') {
        e.preventDefault()
        const raw_pos = raw_caret_pos_ref.current
        if (raw_pos == 0) return

        const { value, context_file_paths = [] } = props
        let i = raw_pos - 1

        while (i >= 0 && /\s/.test(value[i])) {
          i--
        }
        if (i < 0) {
          set_caret_position_after_change(
            input_ref,
            0,
            value,
            context_file_paths
          )
          return
        }

        const symbol_ranges = get_symbol_ranges(value, context_file_paths)
        let new_raw_pos: number | undefined

        // Check if cursor is within a symbol; if so, jump to its start.
        for (const range of symbol_ranges) {
          if (i >= range.start && i < range.end) {
            new_raw_pos = range.start
            break
          }
        }

        if (new_raw_pos === undefined) {
          // Default word-jump behavior.
          const is_word_char = /\w/.test(value[i])
          while (i >= 0) {
            const current_is_word = /\w/.test(value[i])
            if (/\s/.test(value[i]) || current_is_word != is_word_char) {
              break
            }
            i--
          }
          new_raw_pos = i + 1
        }

        set_caret_position_after_change(
          input_ref,
          new_raw_pos,
          value,
          context_file_paths
        )
        return
      }

      if (key == 'ArrowRight') {
        e.preventDefault()
        const { value, context_file_paths = [] } = props
        const raw_pos = raw_caret_pos_ref.current
        if (raw_pos == value.length) return

        let i = raw_pos

        while (i < value.length && /\s/.test(value[i])) {
          i++
        }

        const symbol_ranges = get_symbol_ranges(value, context_file_paths)
        let new_raw_pos: number | undefined

        // Check if cursor is within a symbol; if so, jump to its end.
        for (const range of symbol_ranges) {
          if (i >= range.start && i < range.end) {
            new_raw_pos = range.end
            break
          }
        }

        if (new_raw_pos === undefined) {
          // Default word-jump behavior.
          const is_word_char = /\w/.test(value[i])
          while (i < value.length) {
            const current_is_word = /\w/.test(value[i])
            if (/\s/.test(value[i]) || current_is_word !== is_word_char) {
              break
            }
            i++
          }
          new_raw_pos = i
        }

        set_caret_position_after_change(
          input_ref,
          new_raw_pos,
          value,
          context_file_paths
        )
        return
      }
    }

    if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() == 'z') {
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
        has_modified_current_entry_ref.current = true
      }
      return
    }
    if (
      ((e.ctrlKey || e.metaKey) && key.toLowerCase() == 'y') ||
      ((e.ctrlKey || e.metaKey) && shiftKey && key.toLowerCase() == 'z')
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
        has_modified_current_entry_ref.current = true
      }
      return
    }
    if (key == 'Tab' && !shiftKey) {
      if (ghost_text) {
        e.preventDefault()
        on_accept_ghost_text()
      }
      return
    }

    if (key == 'Backspace') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const raw_pos = raw_caret_pos_ref.current
        if (raw_pos == 0) return

        const value = props.value
        let i = raw_pos - 1

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
        has_modified_current_entry_ref.current = new_value != ''
        update_value(new_value, new_start_pos)
        return
      }
      handle_backspace_key(e)
      return
    }

    if (key == 'Enter') {
      if (props.send_with_shift_enter) {
        if (shiftKey) {
          e.preventDefault()
          handle_submit(e)
        } else {
          e.preventDefault()
          const selection = window.getSelection()
          if (!selection || !selection.rangeCount || !input_ref.current) return

          const range = selection.getRangeAt(0)
          range.deleteContents()
          const text_node = document.createTextNode('\n')
          range.insertNode(text_node)
          range.setStartAfter(text_node)
          range.setEndAfter(text_node)
          selection.removeAllRanges()
          selection.addRange(range)
          input_ref.current.dispatchEvent(new Event('input', { bubbles: true }))
        }
      } else if (!shiftKey) {
        e.preventDefault()
        handle_submit(e)
      }
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
    handle_cut,
    handle_paste,
    handle_input_click
  }
}
