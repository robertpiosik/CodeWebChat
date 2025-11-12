import cn from 'classnames'
import styles from '../ChatInput.module.scss'

const escape_html = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

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
          return `<span class="${
            styles['file-keyword']
          }" contentEditable="false" data-type="file-keyword" title="${escape_html(
            file_path
          )}"><span class="${
            styles['file-keyword__icon']
          }"></span><span class="${styles['file-keyword__text']}">${escape_html(
            filename
          )}</span></span>`
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
  if (params.is_in_code_completions_mode) {
    const regex = /(#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+")/g
    const parts = params.text.split(regex)
    return parts
      .map((part) => {
        if (
          part &&
          /^#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
        ) {
          return `<span class="${
            styles['selection-keyword']
          }" contentEditable="false" data-type="selection-keyword">${escape_html(
            part
          )}</span>`
        }
        return process_text_part_for_files(part, params.context_file_paths)
      })
      .join('')
  }

  const regex =
    /(#Selection|#Changes:[^\s,;:!?]+|#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+")/g
  const parts = params.text.split(regex)

  return parts
    .map((part) => {
      if (part === '#Selection') {
        const className = cn(styles['selection-keyword'], {
          [styles['selection-keyword--error']]: !params.has_active_selection
        })
        return `<span class="${className}" contentEditable="false" data-type="selection-keyword">${escape_html(
          part
        )}</span>`
      }
      if (part && /^#Changes:[^\s,;:!?]+$/.test(part)) {
        return `<span class="${
          styles['selection-keyword']
        }" contentEditable="false" data-type="selection-keyword">${escape_html(
          part
        )}</span>`
      }
      if (
        part &&
        /^#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
      ) {
        return `<span class="${
          styles['selection-keyword']
        }" contentEditable="false" data-type="selection-keyword">${escape_html(
          part
        )}</span>`
      }

      return process_text_part_for_files(part, params.context_file_paths)
    })
    .join('')
}
