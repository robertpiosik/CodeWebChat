import styles from './Timeline.module.scss'
import cn from 'classnames'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export type TimelineItemProps = {
  id: string | number
  timestamp: number
  label: string
  description?: string
  is_starred?: boolean
}

type Props = {
  items: TimelineItemProps[]
  on_toggle_starred: (id: string | number) => void
  on_label_click: (id: string | number) => void
}

export const Timeline: React.FC<Props> = ({
  items,
  on_toggle_starred,
  on_label_click
}) => {
  return (
    <div className={styles.timeline}>
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <div
            className={styles.item__time}
            title={dayjs(item.timestamp).format('LLLL')}
          >
            {dayjs(item.timestamp).fromNow()}
          </div>
          <div className={styles.item__connector}>
            <div
              className={styles.item__marker}
              onClick={() => on_toggle_starred?.(item.id)}
            >
              {item.is_starred ? (
                <span className={cn('codicon', 'codicon-star-full')} />
              ) : (
                <>
                  <div className={styles.item__dot} />
                  <span
                    className={cn(
                      'codicon',
                      'codicon-star',
                      styles['item__star-hover']
                    )}
                  />
                </>
              )}
            </div>
            <div className={styles.item__line} />
          </div>
          <div className={styles.item__content}>
            <div
              className={styles.item__content__label}
              onClick={() => on_label_click(item.id)}
              title="Restore checkpoint"
            >
              {item.label}
            </div>
            {item.description && (
              <div
                className={styles.item__content__description}
                title={item.description}
              >
                {item.description}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
