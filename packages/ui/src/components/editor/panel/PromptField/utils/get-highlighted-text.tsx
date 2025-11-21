import cn from 'classnames'
import styles from '../PromptField.module.scss'

const escape_html = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const process_text_part_for_files = (
  text: string,
  context_file_paths: string[]
): string => {
  const file_path_regex = /`([^\s`]*\.[^\s`]+)`/g
  const parts = text.split(file_path_regex)

  return parts
    .map((part, index) => {
      // part at odd index is a file_path
      if (index % 2 == 1) {
        const file_path = part
        if (context_file_paths.includes(file_path)) {
          const filename = file_path.split('/').pop() || file_path
          return `<span class="${cn(
            styles['keyword'],
            styles['keyword--file']
          )}" data-type="file-keyword" data-path="${escape_html(
            file_path
          )}" title="${escape_html(file_path)}"><span class="${
            styles['keyword__icon']
          }" data-role="keyword-icon"></span><span class="${
            styles['keyword__text']
          }" data-role="keyword-text">${escape_html(filename)}</span></span>`
        }
        // If not a context file, return with backticks
        return `\`${escape_html(file_path)}\``
      }
      // part at even index is regular text
      return escape_html(part)
    })
    .join('')
}

export const get_highlighted_text = (params: {
  text: string
  is_in_code_completions_mode: boolean
  has_active_selection: boolean
  context_file_paths: string[]
}): string => {
  const saved_context_regex_part =
    '#SavedContext:(?:WorkspaceState|JSON)\\s+"[^"]+"'
  if (params.is_in_code_completions_mode) {
    const regex = new RegExp(`(${saved_context_regex_part})`, 'g')
    const parts = params.text.split(regex)
    return parts
      .map((part) => {
        const saved_context_match = part.match(
          /^#SavedContext:(WorkspaceState|JSON)\s+"([^"]+)"$/
        )
        if (part && saved_context_match) {
          const context_type = saved_context_match[1]
          const context_name = saved_context_match[2]
          return `<span class="${cn(
            styles['keyword'],
            styles['keyword--saved-context']
          )}" data-type="saved-context-keyword" data-context-type="${context_type}" data-context-name="${escape_html(
            context_name
          )}"><span class="${
            styles['keyword__icon']
          }" data-role="keyword-icon"></span><span class="${
            styles['keyword__text']
          }" data-role="keyword-text">Context "${escape_html(
            context_name
          )}"</span></span>`
        }
        return process_text_part_for_files(part, params.context_file_paths)
      })
      .join('')
  }

  const commit_regex_part = '#Commit:[^:]+:[^\\s"]+\\s+"[^"]*"'
  const regex = new RegExp(
    `(#Selection|#Changes:[^\\s,;:!?]+|${saved_context_regex_part}|${commit_regex_part})`,
    'g'
  )
  const parts = params.text.split(regex)

  return parts
    .map((part) => {
      if (part == '#Selection') {
        const className = cn(styles['keyword'], styles['keyword--selection'], {
          [styles['keyword--selection-error']]: !params.has_active_selection
        })
        const title = !params.has_active_selection
          ? 'Missing text selection'
          : ''
        return `<span class="${className}" data-type="selection-keyword" title="${title}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Selection</span></span>`
      }
      if (part && /^#Changes:[^\s,;:!?]+$/.test(part)) {
        const branch_name = part.substring('#Changes:'.length)
        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--changes']
        )}" data-type="changes-keyword" data-branch-name="${escape_html(
          branch_name
        )}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Diff with ${escape_html(branch_name)}</span></span>`
      }
      const saved_context_match = part.match(
        /^#SavedContext:(WorkspaceState|JSON)\s+"([^"]+)"$/
      )
      if (part && saved_context_match) {
        const context_type = saved_context_match[1]
        const context_name = saved_context_match[2]
        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--saved-context']
        )}" data-type="saved-context-keyword" data-context-type="${context_type}" data-context-name="${escape_html(
          context_name
        )}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Context "${escape_html(context_name)}"</span></span>`
      }
      const commit_match = part.match(/^#Commit:([^:]+):([^\s"]+)\s+"([^"]*)"$/)
      if (part && commit_match) {
        const repo_name = commit_match[1]
        const commit_hash = commit_match[2]
        const commit_message = commit_match[3]
        const short_hash = commit_hash.substring(0, 7)
        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--commit']
        )}" data-type="commit-keyword" data-repo-name="${escape_html(
          repo_name
        )}" data-commit-hash="${escape_html(
          commit_hash
        )}" data-commit-message="${escape_html(
          commit_message
        )}" title="${escape_html(commit_message)}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">${escape_html(short_hash)}</span></span>`
      }

      return process_text_part_for_files(part, params.context_file_paths)
    })
    .join('')
}
