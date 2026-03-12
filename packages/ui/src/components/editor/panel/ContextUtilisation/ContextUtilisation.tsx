import styles from './ContextUtilisation.module.scss'
import cn from 'classnames'

type Props = {
  current_context_size: number
  context_size_warning_threshold: number
  is_context_disabled?: boolean
  is_only_file_tree_active?: boolean
  file_tree_token_count?: number
}

const format_tokens = (tokens: number): string => {
  if (tokens < 1000) {
    return tokens.toString()
  }
  const k = Math.floor(tokens / 1000)
  return k.toString() + 'K'
}

export const ContextUtilisation: React.FC<Props> = (props) => {
  if (props.is_context_disabled) {
    return (
      <div className={styles.container}>
        <div className={styles.bar} />
        <span className={styles.label} style={{ fontStyle: 'italic' }}>
          Context disabled
        </span>
      </div>
    )
  }

  const active_token_count =
    props.is_only_file_tree_active && props.file_tree_token_count !== undefined
      ? props.file_tree_token_count
      : props.current_context_size

  const is_above_threshold =
    active_token_count > props.context_size_warning_threshold
  const progress = Math.min(
    (active_token_count / props.context_size_warning_threshold) * 100,
    100
  )
  const display_progress = active_token_count > 0 ? Math.max(progress, 1) : 0

  if (
    props.is_only_file_tree_active &&
    props.file_tree_token_count !== undefined
  ) {
    return (
      <div className={styles.container}>
        <div className={styles.bar}>
          <div
            className={cn(styles.bar__progress, {
              [styles['bar__progress--warning']]: is_above_threshold
            })}
            style={{ width: `${display_progress}%` }}
          />
        </div>
        <span
          className={styles.label}
          title="Only file tree is provided as context"
        >
          ~{format_tokens(props.file_tree_token_count)} file tree tokens
        </span>
      </div>
    )
  }

  const formatted_current_size = format_tokens(active_token_count)
  const formatted_threshold = format_tokens(
    props.context_size_warning_threshold
  )

  let title_text = ''

  if (!is_above_threshold) {
    const remaining_tokens =
      props.context_size_warning_threshold -
      (active_token_count < 1000
        ? active_token_count
        : Math.floor(active_token_count / 1000) * 1000)
    const formatted_remaining_tokens = format_tokens(remaining_tokens)
    title_text = `${formatted_remaining_tokens} tokens remaining until threshold warning (change in settings)`
  } else {
    const exceeded_by =
      active_token_count - props.context_size_warning_threshold
    const formatted_exceeded_by = format_tokens(exceeded_by)
    title_text = `Threshold of ${formatted_threshold} tokens is exceeded by ${formatted_exceeded_by} tokens`
  }

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <div
          className={cn(styles.bar__progress, {
            [styles['bar__progress--warning']]: is_above_threshold
          })}
          style={{ width: `${display_progress}%` }}
        />
      </div>
      <span className={styles.label} title={title_text}>
        {formatted_current_size} tokens in context
      </span>
    </div>
  )
}
