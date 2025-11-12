import cn from 'classnames'
import styles from '../ChatInput.module.scss'

const escape_html = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

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
      .map((part, index) => {
        if (
          part &&
          /^#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
        ) {
          return `<span class="${styles['selection-keyword']}">${escape_html(
            part
          )}</span>`
        }
        return escape_html(part)
      })
      .join('')
  }

  const regex =
    /(#Selection|#Changes:[^\s,;:.!?]+(?:\/[^\s,;:.!?]+)?|#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+")/g
  const parts = params.text.split(regex)

  return parts
    .map((part) => {
      if (part === '#Selection') {
        const className = cn(styles['selection-keyword'], {
          [styles['selection-keyword--error']]: !params.has_active_selection
        })
        return `<span class="${className}">${escape_html(part)}</span>`
      }
      if (part && /^#Changes:[^\s,;:.!?]+(?:\/[^\s,;:.!?]+)?$/.test(part)) {
        return `<span class="${styles['selection-keyword']}">${escape_html(
          part
        )}</span>`
      }
      if (
        part &&
        /^#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
      ) {
        return `<span class="${styles['selection-keyword']}">${escape_html(
          part
        )}</span>`
      }

      const filename_regex = /([^\s,;:.!?`]+\.[^\s,;:.!?`]+)/g
      return part
        .split(filename_regex)
        .map((sub_part, index) => {
          if (index % 2 == 1) {
            const is_context_file = params.context_file_paths.some(
              (path) => path.endsWith('/' + sub_part) || path == sub_part
            )
            if (is_context_file) {
              return `<span class="${
                styles['selection-keyword']
              }">${escape_html(sub_part)}</span>`
            }
          }
          return escape_html(sub_part)
        })
        .join('')
    })
    .join('')
}
