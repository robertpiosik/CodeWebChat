import { RefObject } from 'react'
import { get_caret_position_from_div } from './caret'
import { map_display_pos_to_raw_pos } from './position-mapping'

export const use_symbol_deletion = (params: {
  value: string
  context_file_paths: string[]
  input_ref: RefObject<HTMLElement>
  on_delete: (new_value: string, new_caret_pos: number) => void
}) => {
  const apply_symbol_deletion = (start_pos: number, end_pos: number) => {
    let leading_part = params.value.substring(0, start_pos)
    let trailing_part = params.value.substring(end_pos)

    if (trailing_part.startsWith(' ')) {
      trailing_part = trailing_part.substring(1)
    } else if (leading_part.endsWith(' ')) {
      leading_part = leading_part.slice(0, -1)
    }

    const new_value = leading_part + trailing_part
    const new_raw_cursor_pos = leading_part.length
    params.on_delete(new_value, new_raw_cursor_pos)
  }

  const handle_symbol_deletion_by_click = (symbol_element: HTMLElement) => {
    const symbol_type = symbol_element.dataset.type
    if (symbol_type == 'file-symbol') {
      const file_path = symbol_element.dataset.path
      if (!file_path || !params.context_file_paths?.includes(file_path)) return

      const search_pattern = `\`${file_path}\``
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'changes-symbol') {
      const branch_name = symbol_element.dataset.branchName
      if (!branch_name) return

      const search_pattern = `#Changes(${branch_name})`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'saved-context-symbol') {
      const context_type = symbol_element.dataset.contextType
      const context_name = symbol_element.dataset.contextName
      if (!context_type || !context_name) return

      const search_pattern = `#SavedContext(${context_type} "${context_name
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')}")`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'selection-symbol') {
      const search_pattern = '#Selection'
      const start_index = params.value.indexOf(search_pattern)

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
        '\\\\"'
      )}")`
      const start_index = params.value.indexOf(search_pattern)

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
        '\\\\"'
      )}")`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'skill-symbol') {
      const agent = symbol_element.dataset.agent
      const repo = symbol_element.dataset.repo
      const skillName = symbol_element.dataset.skillName
      if (!agent || !repo || !skillName) return

      const search_pattern = `#Skill(${agent}:${repo}:${skillName})`
      const start_index = params.value.indexOf(search_pattern)

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
      let start_index = params.value.indexOf(search_pattern)

      if (start_index == -1) {
        search_pattern = search_pattern_old
        start_index = params.value.indexOf(search_pattern)
      }

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'image-symbol') {
      const hash = symbol_element.dataset.hash
      if (!hash) return

      const search_pattern = `#Image(${hash})`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'pasted-text-symbol') {
      const hash = symbol_element.dataset.hash
      const token_count = symbol_element.dataset.tokenCount
      if (!hash || !token_count) return

      const search_pattern = `#PastedText(${hash}:${token_count})`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'website-symbol') {
      const url = symbol_element.dataset.url
      if (!url) return

      const search_pattern = `#Website(${url})`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    } else if (symbol_type == 'url-symbol') {
      const url = symbol_element.dataset.url
      if (!url) return

      const search_pattern = `#Url(${url})`
      const start_index = params.value.indexOf(search_pattern)

      if (start_index != -1) {
        apply_symbol_deletion(start_index, start_index + search_pattern.length)
      }
    }
  }

  const handle_file_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    let start_of_path = -1
    const end_of_path = raw_pos - 1

    if (end_of_path >= 0 && params.value[end_of_path] == '`') {
      const text_before = params.value.substring(0, end_of_path)
      start_of_path = text_before.lastIndexOf('`')
    }

    if (
      start_of_path != -1 &&
      end_of_path != -1 &&
      start_of_path < end_of_path
    ) {
      const path_in_backticks = params.value.substring(
        start_of_path + 1,
        end_of_path
      )
      if (context_file_paths.includes(path_in_backticks)) {
        const new_value =
          params.value.substring(0, start_of_path) +
          params.value.substring(end_of_path + 1)
        const new_raw_cursor_pos = start_of_path
        params.on_delete(new_value, new_raw_cursor_pos)
        return true
      }
    }
    return false
  }

  const handle_changes_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Changes\([^)]+\)$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_saved_context_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#SavedContext\((?:WorkspaceState|JSON) "(?:\\.|[^"\\])*"\)$/
    )

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_selection_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Selection$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_commit_symbol_deletion = (
    raw_pos: number,
    context_file_paths: string[]
  ): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#(?:Commit|ContextAtCommit)\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\)$/
    )

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_skill_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Skill\([^)]+\)$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_pasted_lines_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)

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
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_image_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Image\(([a-fA-F0-9]+)\)$/)

    if (match) {
      const hash = match[1]
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_pasted_text_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(
      /#PastedText\(([a-fA-F0-9]+)(?: (\d+))?\)$/
    )

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_website_symbol_deletion = (raw_pos: number): boolean => {
    const text_before_cursor = params.value.substring(0, raw_pos)
    const match = text_before_cursor.match(/#Website\(([^)]+)\)$/)

    if (match) {
      const start_of_match = raw_pos - match[0].length
      const new_value =
        params.value.substring(0, start_of_match) +
        params.value.substring(raw_pos)
      const new_raw_cursor_pos = start_of_match
      params.on_delete(new_value, new_raw_cursor_pos)
      return true
    }
    return false
  }

  const handle_symbol_deletion_by_backspace = (deletion_params: {
    el: HTMLElement
    display_pos: number
  }): boolean => {
    const context_file_paths = params.context_file_paths
    const raw_pos = map_display_pos_to_raw_pos({
      display_pos: deletion_params.display_pos,
      raw_text: params.value,
      context_file_paths
    })

    if (deletion_params.el.dataset.type == 'file-symbol') {
      return handle_file_symbol_deletion(raw_pos, context_file_paths)
    }

    if (deletion_params.el.dataset.type == 'changes-symbol') {
      return handle_changes_symbol_deletion(raw_pos, context_file_paths)
    }

    if (deletion_params.el.dataset.type == 'saved-context-symbol') {
      return handle_saved_context_symbol_deletion(raw_pos, context_file_paths)
    }

    if (deletion_params.el.dataset.type == 'selection-symbol') {
      return handle_selection_symbol_deletion(raw_pos, context_file_paths)
    }

    if (
      deletion_params.el.dataset.type == 'commit-symbol' ||
      deletion_params.el.dataset.type == 'contextatcommit-symbol'
    ) {
      return handle_commit_symbol_deletion(raw_pos, context_file_paths)
    }

    if (deletion_params.el.dataset.type == 'skill-symbol') {
      return handle_skill_symbol_deletion(raw_pos)
    }

    if (deletion_params.el.dataset.type == 'pasted-lines-symbol') {
      return handle_pasted_lines_symbol_deletion(raw_pos)
    }

    if (deletion_params.el.dataset.type == 'image-symbol') {
      return handle_image_symbol_deletion(raw_pos)
    }

    if (deletion_params.el.dataset.type == 'pasted-text-symbol') {
      return handle_pasted_text_symbol_deletion(raw_pos)
    }

    if (deletion_params.el.dataset.type == 'website-symbol') {
      return handle_website_symbol_deletion(raw_pos)
    }

    return false
  }

  const handle_backspace_key = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (
      !params.input_ref.current ||
      !selection ||
      selection.rangeCount == 0 ||
      !selection.isCollapsed
    ) {
      return
    }

    const range = selection.getRangeAt(0)
    const { startContainer, startOffset } = range

    let current_node: Node | null = startContainer
    let symbol_node: HTMLElement | null = null

    while (current_node && current_node !== params.input_ref.current) {
      if (
        current_node.nodeType === Node.ELEMENT_NODE &&
        (current_node as HTMLElement).dataset.type?.endsWith('-symbol')
      ) {
        symbol_node = current_node as HTMLElement
        break
      }
      current_node = current_node.parentNode
    }

    if (symbol_node) {
      const range_after = document.createRange()
      range_after.selectNodeContents(symbol_node)
      range_after.collapse(false)

      const pre_caret_range = document.createRange()
      pre_caret_range.selectNodeContents(params.input_ref.current)
      pre_caret_range.setEnd(range_after.endContainer, range_after.endOffset)

      const display_pos = pre_caret_range.toString().length

      if (
        handle_symbol_deletion_by_backspace({ el: symbol_node, display_pos })
      ) {
        e.preventDefault()
        return
      }
    }

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
      while (parent && parent !== params.input_ref.current) {
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
          parent.dataset.type == 'pasted-text-symbol' ||
          parent.dataset.type == 'website-symbol'
        ) {
          const range_after = document.createRange()
          range_after.selectNodeContents(parent)
          range_after.setStart(startContainer, startOffset)
          if (range_after.toString().trim() == '') {
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
        el.dataset.type == 'pasted-text-symbol' ||
        el.dataset.type == 'website-symbol'
      ) {
        const display_pos = get_caret_position_from_div(
          params.input_ref.current
        )
        if (handle_symbol_deletion_by_backspace({ el, display_pos })) {
          e.preventDefault()
        }
      }
    }
  }

  return {
    handle_symbol_deletion_by_click,
    handle_backspace_key
  }
}
