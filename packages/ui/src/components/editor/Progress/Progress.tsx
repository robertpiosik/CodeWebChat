import { useEffect, useState } from 'react'
import styles from './Progress.module.scss'
import cn from 'classnames'
import { Button } from '../Button'

type Props = {
  title: string
  progress?: number
  on_cancel: () => void
  tokens_per_second?: number
}

const format_tokens_per_second = (tps: number): string => {
  const rounded_tps = Math.round(tps)
  if (rounded_tps >= 1000) {
    return `${(rounded_tps / 1000).toFixed(1)}k`
  }
  return rounded_tps.toString()
}

export const Progress: React.FC<Props> = (props) => {
  const [is_hydrated, set_is_hydrated] = useState(false) // For entry animation
  const [elapsed_time, set_elapsed_time] = useState(0)

  useEffect(() => {
    set_is_hydrated(true)
  }, [])

  useEffect(() => {
    const start_time = Date.now()
    const timer = setInterval(() => {
      set_elapsed_time((Date.now() - start_time) / 1000)
    }, 100)

    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className={cn(styles.overlay, {
        [styles['overlay--visible']]: is_hydrated
      })}
    >
      <div className={styles.container}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles['elapsed-time']}>{elapsed_time.toFixed(1)}s</div>
        {props.tokens_per_second !== undefined && (
          <div className={styles['tokens-per-second']}>
            ~{format_tokens_per_second(props.tokens_per_second)} tokens/s
          </div>
        )}
        {(props.progress !== undefined ||
          props.tokens_per_second !== undefined) && (
          <div className={styles.progress}>
            {props.progress !== undefined ? (
              <div
                className={styles.progress__fill}
                style={{ width: `${props.progress}%` }}
              />
            ) : (
              <div className={styles['progress__fill--indeterminate']} />
            )}
          </div>
        )}
        <Button on_click={props.on_cancel}>Cancel</Button>
      </div>
    </div>
  )
}
