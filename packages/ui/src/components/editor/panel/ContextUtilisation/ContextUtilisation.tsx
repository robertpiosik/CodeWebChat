import styles from './ContextUtilisation.module.scss'
import cn from 'classnames'

type Props = {
  current_context_size: number
  context_size_warning_threshold: number
}

const format_tokens = (tokens: number): string => {
  if (tokens < 1000) {
    return tokens.toString()
  }
  const k = Math.floor(tokens / 1000)
  return k.toString() + 'K'
}

export const ContextUtilisation: React.FC<Props> = (props) => {
  const is_above_threshold =
    props.current_context_size > props.context_size_warning_threshold
  const progress = Math.min(
    (props.current_context_size / props.context_size_warning_threshold) * 100,
    100
  )

  const formatted_current_size = format_tokens(props.current_context_size)
  const formatted_threshold = format_tokens(
    props.context_size_warning_threshold
  )

  const display_current_size = is_above_threshold
    ? `⚠ ${formatted_current_size}`
    : formatted_current_size

  let title_text = ''

  if (!is_above_threshold) {
    const remaining_tokens =
      props.context_size_warning_threshold -
      (props.current_context_size < 1000
        ? props.current_context_size
        : Math.floor(props.current_context_size / 1000) * 1000)
    const formatted_remaining_tokens = format_tokens(remaining_tokens)
    title_text = `${formatted_remaining_tokens} tokens remaining until threshold warning (change in settings)`
  } else {
    title_text = `Context of size ${formatted_current_size} exceeds threshold ${formatted_threshold} by `
  }

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <div
          className={cn(styles.bar__progress, {
            [styles['bar__progress--warning']]: is_above_threshold
          })}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={styles.label} title={title_text}>
        {display_current_size} tokens in context
      </span>
    </div>
  )
}
