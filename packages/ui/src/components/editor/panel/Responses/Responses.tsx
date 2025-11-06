import { useEffect, useState } from 'react'
import cn from 'classnames'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { FileInPreview } from '@shared/types/file-in-preview'
import styles from './Responses.module.scss'

dayjs.extend(relativeTime)

export type ResponseHistoryItem = {
  response: string
  raw_instructions?: string
  created_at: number
  lines_added?: number
  lines_removed?: number
  files?: FileInPreview[]
}

type Props = {
  response_history: ResponseHistoryItem[]
  on_response_history_item_click: (item: {
    response: string
    raw_instructions?: string
    files?: FileInPreview[]
  }) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
}

export const Responses: React.FC<Props> = (props) => {
  // Re-render every minute to update the relative time of the history responses.
  const [, set_now] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => {
      set_now(Date.now())
    }, 60 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  if (props.response_history.length == 0) {
    return null
  }

  return (
    <div className={styles.responses}>
      {props.response_history.map((item) => (
        <button
          key={item.created_at}
          className={cn(styles['responses__item'], {
            [styles['responses__item--selected']]:
              props.response_history.length > 1 &&
              props.selected_history_item_created_at == item.created_at
          })}
          title={item.raw_instructions}
          onClick={() => {
            props.on_response_history_item_click(item)
            props.on_selected_history_item_change(item.created_at)
          }}
        >
          <span className={styles['responses__item__instruction']}>
            {item.raw_instructions || 'Response without instructions'}
          </span>
          <div className={styles['responses__item__right']}>
            {item.lines_added !== undefined &&
              item.lines_removed !== undefined && (
                <div className={styles['responses__item__stats']}>
                  <span className={styles['responses__item__stats--added']}>
                    +{item.lines_added}
                  </span>
                  <span className={styles['responses__item__stats--removed']}>
                    -{item.lines_removed}
                  </span>
                </div>
              )}
            <span className={styles['responses__item__date']}>
              {dayjs(item.created_at).fromNow()}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
