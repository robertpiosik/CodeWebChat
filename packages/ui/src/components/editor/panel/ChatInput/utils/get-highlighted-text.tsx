import cn from 'classnames'
import styles from '../ChatInput.module.scss'

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
          )}" contentEditable="false" data-type="file-keyword" title="${file_path}"><span class="${
            styles['keyword__icon']
          }"></span><span class="${
            styles['keyword__text']
          }">${filename}</span></span>`
        }
        // If not a context file, return with backticks
        return `\`${file_path}\``
      }
      // part at even index is regular text
      return part
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
          )}" contentEditable="false" data-type="saved-context-keyword" data-context-type="${context_type}" data-context-name="${context_name}" title="Context &quot;${context_name}&quot;"><span class="${
            styles['keyword__icon']
          }"></span><span class="${
            styles['keyword__text']
          }">Context "${context_name}"</span></span>`
        }
        return process_text_part_for_files(part, params.context_file_paths)
      })
      .join('')
  }

  const regex = new RegExp(
    `(#Selection|#Changes:[^\\s,;:!?]+|${saved_context_regex_part})`,
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
        return `<span class="${className}" contentEditable="false" data-type="selection-keyword" title="${title}"><span class="${styles['keyword__icon']}"></span><span class="${styles['keyword__text']}">Selection</span></span>`
      }
      if (part && /^#Changes:[^\s,;:!?]+$/.test(part)) {
        const branch_name = part.substring('#Changes:'.length)
        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--changes']
        )}" contentEditable="false" data-type="changes-keyword" data-branch-name="${branch_name}"><span class="${
          styles['keyword__icon']
        }"></span><span class="${
          styles['keyword__text']
        }">Diff with ${branch_name}</span></span>`
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
        )}" contentEditable="false" data-type="saved-context-keyword" data-context-type="${context_type}" data-context-name="${context_name}" title="Context &quot;${context_name}&quot;"><span class="${
          styles['keyword__icon']
        }"></span><span class="${
          styles['keyword__text']
        }">Context "${context_name}"</span></span>`
      }

      return process_text_part_for_files(part, params.context_file_paths)
    })
    .join('')
}
