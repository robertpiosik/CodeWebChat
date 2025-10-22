import { FC } from 'react'
import styles from './ContextUtilisation.module.scss'
import cn from 'classnames'

type Props = {
  current_context_size: number
  context_size_warning_threshold: number
}

const format_number = (num: number): string => {
  if (num < 1000) {
    return num.toLocaleString()
  }
  return `${Math.floor(num / 1000)}k`
}

export const ContextUtilisation: FC<Props> = (props) => {
  const { current_context_size, context_size_warning_threshold } = props
  const is_above_threshold =
    current_context_size > context_size_warning_threshold
  const progress = Math.min(
    (current_context_size / context_size_warning_threshold) * 100,
    100
  )

  return (
    <div className={styles.container}>
      <span className={styles.label}>
        {format_number(current_context_size)}
      </span>
      <div className={styles.bar}>
        <div
          className={cn(styles.bar__progress, {
            [styles['bar__progress--warning']]: is_above_threshold
          })}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={styles.label}>
        {format_number(context_size_warning_threshold)}
      </span>
    </div>
  )
}
