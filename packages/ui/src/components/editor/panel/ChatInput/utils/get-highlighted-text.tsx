import cn from 'classnames'
import styles from '../ChatInput.module.scss'

export const get_highlighted_text = (params: {
  text: string
  is_in_code_completions_mode: boolean
  has_active_selection: boolean
  context_file_paths: string[]
}) => {
  if (params.is_in_code_completions_mode) {
    const regex = /(#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+")/g
    const parts = params.text.split(regex)
    return parts.map((part, index) => {
      if (
        part &&
        /^#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
      ) {
        return (
          <span key={index} className={styles['selection-keyword']}>
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const regex =
    /(#Selection|#Changes:[^\s,;:.!?]+(?:\/[^\s,;:.!?]+)?|#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"|`[^\s`]*\.[^\s`]+`)/g
  const parts = params.text.split(regex)
  return parts.map((part, index) => {
    if (part == '#Selection') {
      return (
        <span
          key={index}
          className={cn(styles['selection-keyword'], {
            [styles['selection-keyword--error']]: !params.has_active_selection
          })}
        >
          {part}
        </span>
      )
    }
    if (part && /^#Changes:[^\s,;:.!?]+(?:\/[^\s,;:.!?]+)?$/.test(part)) {
      return (
        <span key={index} className={styles['selection-keyword']}>
          {part}
        </span>
      )
    }
    if (
      part &&
      /^#SavedContext:(?:WorkspaceState|JSON)\s+"[^"]+"$/.test(part)
    ) {
      return (
        <span key={index} className={styles['selection-keyword']}>
          {part}
        </span>
      )
    }
    if (part && /^`[^\s`]*\.[^\s`]+`$/.test(part)) {
      const file_path = part.slice(1, -1)
      return (
        <span
          key={index}
          className={cn({
            [styles['selection-keyword']]:
              params.context_file_paths.includes(file_path)
          })}
        >
          {part}
        </span>
      )
    }
    return <span key={index}>{part}</span>
  })
}
