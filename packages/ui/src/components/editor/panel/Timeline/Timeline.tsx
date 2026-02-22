import { useEffect, useState } from 'react'
import styles from './Timeline.module.scss'
import cn from 'classnames'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { IconButton } from '../../common/IconButton'
import { use_dayjs_locale } from '../../../../hooks/use-dayjs-locale'

dayjs.extend(localizedFormat)

export type TimelineItemProps = {
  id: number
  timestamp: number
  label: string
  description?: string
  is_starred?: boolean
  can_edit?: boolean
}

type Props = {
  items: TimelineItemProps[]
  on_toggle_starred: (id: number) => void
  on_item_click: (id: number) => void
  on_delete?: (id: number) => void
  on_edit?: (id: number) => void
}

export const Timeline: React.FC<Props> = (props) => {
  const [local_items, set_local_items] = useState(props.items)
  const [locked, set_locked] = useState(false)

  use_dayjs_locale()

  useEffect(() => {
    set_local_items(props.items)
    set_locked(false)
  }, [props.items])

  return (
    <div className={styles.timeline}>
      {local_items.map((item) => (
        <div
          key={item.id}
          className={styles.item}
          onClick={() => props.on_item_click(item.id)}
        >
          <div
            className={styles.item__time}
            title={dayjs(item.timestamp).format('LLLL')}
          >
            {dayjs(item.timestamp).format('LT')}
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
                    if (locked) return
                    set_locked(true)
                    set_local_items((prev) =>
                      prev.map((i) =>
                        i.id == item.id
                          ? { ...i, is_starred: !i.is_starred }
                          : i
                      )
                    )
                    props.on_toggle_starred(item.id)
                  }}
                />
                {props.on_edit && item.can_edit && (
                  <IconButton
                    codicon_icon="edit"
                    title="Edit description"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_edit!(item.id)
                    }}
                  />
                )}
                {props.on_delete && (
                  <IconButton
                    codicon_icon="trash"
                    title="Delete"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_delete!(item.id)
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
