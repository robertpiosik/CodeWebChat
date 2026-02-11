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

    return () => {
      clearTimeout(visibility_timer)
    }
  }, [props.delay_visibility])

  return is_visible ? (
    <div
      onKeyDown={(e) => {
        if (e.key == 'Escape') {
          e.stopPropagation()
          props.on_cancel?.()
        }
      }}
    >
      <Modal
        title={props.title}
        show_elapsed_time={props.show_elapsed_time}
        content_slot={
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
