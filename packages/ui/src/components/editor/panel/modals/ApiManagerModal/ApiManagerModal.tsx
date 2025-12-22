import { useEffect, useState } from 'react'
import styles from './ApiManagerModal.module.scss'
import { Scrollable } from '../../Scrollable'
import cn from 'classnames'

type Props = {
  progress_items: {
    id: string
    title: string
    tokens_per_second?: number
    total_tokens?: number
    show_elapsed_time?: boolean
    delay_visibility?: boolean
  }[]
  on_cancel: (id: string) => void
}

const format_tokens = (tokens: number): string => {
  const rounded = Math.round(tokens)
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(1)}k`
  }
  return rounded.toString()
}

export const ApiManagerModal: React.FC<Props> = (props) => {
  const [start_times, set_start_times] = useState<Record<string, number>>({})
  const [now, set_now] = useState(Date.now())
  const [is_scrolled, set_is_scrolled] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      set_now(Date.now())
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    set_start_times((prev) => {
      const next = { ...prev }
      let changed = false
      const current_ids = new Set(props.progress_items.map((i) => i.id))

      props.progress_items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = Date.now()
          changed = true
        }
      })

      Object.keys(next).forEach((id) => {
        if (!current_ids.has(id)) {
          delete next[id]
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [props.progress_items])

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div
          className={cn(styles.title, {
            [styles['title--scrolled']]: is_scrolled
          })}
        >
          API Manager
        </div>
        <Scrollable max_height="20vh" on_scrolled_change={set_is_scrolled}>
          <div className={styles.content}>
            <div className={styles['requests-container']}>
              {props.progress_items.map((item) => {
                const item_start_time = start_times[item.id]
                const current_start_time = item_start_time || Date.now()
                const elapsed_ms = now - current_start_time

                if (item.delay_visibility && elapsed_ms < 1000) {
                  return null
                }

                return (
                  <div key={item.id} className={styles.item}>
                    <div className={styles.item__content}>
                      <div className={styles.item__title}>{item.title}</div>
                      <div className={styles.item__right}>
                        {item.tokens_per_second !== undefined && (
                          <div className={styles['tokens-per-second']}>
                            {format_tokens(item.tokens_per_second)} tokens/s
                          </div>
                        )}
                        {item.total_tokens !== undefined && (
                          <div className={styles['tokens-per-second']}>
                            ({format_tokens(item.total_tokens)})
                          </div>
                        )}
                        {item.show_elapsed_time !== false && (
                          <div className={styles['elapsed-time']}>
                            {(elapsed_ms / 1000).toFixed(1)}s
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.item__abort}>
                      <button
                        className={styles.item__abort__button}
                        onClick={() => props.on_cancel(item.id)}
                      >
                        Abort
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Scrollable>
      </div>
    </div>
  )
}
