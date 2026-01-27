import { useEffect, useState } from 'react'
import styles from './ProgressModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal } from '../Modal'

type Props = {
  title: string
  on_cancel?: () => void
  progress?: number
  tokens_per_second?: number
  show_elapsed_time?: boolean
  delay_visibility?: boolean
}

const format_tokens_per_second = (tps: number): string => {
  const rounded_tps = Math.round(tps)
  if (rounded_tps >= 1000) {
    return `${(rounded_tps / 1000).toFixed(1)}k`
  }
  return rounded_tps.toString()
}

export const ProgressModal: React.FC<Props> = (props) => {
  const [is_visible, set_is_visible] = useState(!props.delay_visibility)
  const [elapsed_time, set_elapsed_time] = useState(0)

  useEffect(() => {
    let visibility_timer: NodeJS.Timeout | undefined
    if (props.delay_visibility) {
      set_is_visible(false)
      visibility_timer = setTimeout(() => {
        set_is_visible(true)
      }, 1500)
    } else {
      set_is_visible(true)
    }

    let elapsed_time_timer: NodeJS.Timeout | undefined
    if (props.show_elapsed_time !== false) {
      set_elapsed_time(0)
      const start_time = Date.now()
      elapsed_time_timer = setInterval(() => {
        set_elapsed_time((Date.now() - start_time) / 1000)
      }, 100)
    }

    return () => {
      clearTimeout(visibility_timer)
      clearInterval(elapsed_time_timer)
    }
  }, [props.show_elapsed_time, props.delay_visibility])

  return is_visible ? (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          props.on_cancel?.()
        }
      }}
    >
      <Modal
        title={props.title}
        content_slot={
          <>
            {props.show_elapsed_time !== false && (
              <div className={styles['elapsed-time']}>
                {elapsed_time.toFixed(1)}s
              </div>
            )}

            <div className={styles.content}>
              {props.tokens_per_second !== undefined && (
                <div className={styles['tokens-per-second']}>
                  {format_tokens_per_second(props.tokens_per_second)} tokens/s
                </div>
              )}
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
            </div>
          </>
        }
        footer_slot={
          props.on_cancel ? (
            <Button on_click={props.on_cancel}>Cancel</Button>
          ) : undefined
        }
      />
    </div>
  ) : null
}
