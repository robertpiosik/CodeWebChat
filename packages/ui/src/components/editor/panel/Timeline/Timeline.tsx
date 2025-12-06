import styles from './Timeline.module.scss'
import cn from 'classnames'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { use_periodic_re_render } from '../../../../hooks/use-periodic-re-render'
import { IconButton } from '../IconButton/IconButton'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

export type TimelineItemProps = {
  id: number
  timestamp: number
  label: string
  description?: string
  is_starred?: boolean
}

type Props = {
  items: TimelineItemProps[]
  on_toggle_starred: (id: number) => void
  on_item_click: (id: number) => void
  on_delete?: (id: number) => void
  on_edit?: (id: number) => void
}

export const Timeline: React.FC<Props> = ({
  items,
  on_toggle_starred,
  on_item_click,
  on_delete,
  on_edit
}) => {
  // Re-render every minute to update the relative time of the timeline items.
  use_periodic_re_render(60 * 1000)

  return (
    <div className={styles.timeline}>
      {items.map((item) => (
        <div
          key={item.id}
          className={styles.item}
          onClick={() => on_item_click(item.id)}
        >
          <div
            className={styles.item__time}
            title={dayjs(item.timestamp).format('LLLL')}
          >
            {dayjs(item.timestamp).fromNow()}
          </div>
          <div className={styles.item__connector}>
            <div className={styles.item__marker}>
              <div className={styles.item__dot} />
            </div>
            {item.description && <div className={styles.item__line} />}
          </div>
          <div className={styles.item__content}>
            <div className={styles['item__content__title-bar']}>
              <span title="Restore checkpoint">
                {item.is_starred && (
                  <span
                    className={cn(
                      'codicon',
                      'codicon-star-full',
                      styles['item__star-prefix']
                    )}
                  />
                )}
                {item.label}
              </span>
              <div className={styles.item__actions}>
                <IconButton
                  codicon_icon={item.is_starred ? 'star-full' : 'star-empty'}
                  title={item.is_starred ? 'Unstar' : 'Star'}
                  on_click={(e) => {
                    e.stopPropagation()
                    on_toggle_starred?.(item.id)
                  }}
                />
                {on_edit && (
                  <IconButton
                    codicon_icon="edit"
                    title="Edit description"
                    on_click={(e) => {
                      e.stopPropagation()
                      on_edit(item.id)
                    }}
                  />
                )}
                {on_delete && (
                  <IconButton
                    codicon_icon="trash"
                    title="Delete"
                    on_click={(e) => {
                      e.stopPropagation()
                      on_delete(item.id)
                    }}
                  />
                )}
              </div>
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
