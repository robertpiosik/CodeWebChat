import styles from './ContextUtilisation.module.scss'
import cn from 'classnames'

type Props = {
  current_context_size: number
  context_size_warning_threshold: number
}

export const ContextUtilisation: React.FC<Props> = (props) => {
  const is_above_threshold =
    props.current_context_size > props.context_size_warning_threshold
  const progress = Math.min(
    (props.current_context_size / props.context_size_warning_threshold) * 100,
    100
  )

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
      <span
        className={styles.label}
        title="Context larger than set threshold of tokens will show warning"
      >
        {props.current_context_size > 0
          ? `~${props.current_context_size}`
          : '0'}
        /{props.context_size_warning_threshold}
      </span>
    </div>
  )
}
