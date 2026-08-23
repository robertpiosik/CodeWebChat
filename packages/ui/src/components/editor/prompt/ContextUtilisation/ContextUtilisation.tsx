import styles from './ContextUtilisation.module.scss'

type Props = {
  current_context_size: number
  is_context_disabled?: boolean
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
        <span className={styles.label} style={{ fontStyle: 'italic' }}>
          Context disabled
        </span>
      </div>
    )
  }

  const formatted_current_size = format_tokens(props.current_context_size)

  return (
    <div className={styles.container}>
      <span className={styles.label}>
        {formatted_current_size} tokens in context
      </span>
    </div>
  )
}
