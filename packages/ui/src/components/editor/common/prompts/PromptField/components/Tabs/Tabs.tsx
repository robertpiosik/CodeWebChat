import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ReactSortable } from 'react-sortablejs'
import cn from 'classnames'
import styles from './Tabs.module.scss'

type Props = {
  tabs_count: number
  active_tab_index: number
  on_tabs_reorder?: (new_order: number[]) => void
  handle_input_click?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export type TabsRef = {
  handle_mouse_leave: () => void
}

export const Tabs = forwardRef<TabsRef, Props>((props, ref) => {
  const [tab_items, set_tab_items] = useState<{ id: string }[]>([])

  useImperativeHandle(ref, () => ({
    handle_mouse_leave: () => {}
  }))

  useEffect(() => {
    set_tab_items((prev) => {
      if (prev.length === props.tabs_count) return prev
      if (prev.length < props.tabs_count) {
        return [
          ...prev,
          ...Array.from({ length: props.tabs_count - prev.length }).map(() => ({
            id: Math.random().toString(36).substring(7)
          }))
        ]
      }
      return prev.slice(0, props.tabs_count)
    })
  }, [props.tabs_count])

  if (props.tabs_count >= 1) {
    return (
      <ReactSortable
        list={tab_items}
        setList={(new_list) => {
          const has_changed = new_list.some(
            (item, i) => item.id !== tab_items[i]?.id
          )
          if (has_changed) {
            const new_order = new_list.map((item) =>
              tab_items.findIndex((t) => t.id === item.id)
            )
            set_tab_items(new_list)
            props.on_tabs_reorder?.(new_order)
          }
        }}
        className={styles.tabs}
        animation={150}
        filter={`.${styles['tabs__tab--new']}, .${styles['tabs__tab--close']}`}
      >
        {tab_items.map((item, i) => {
          const is_active = i == props.active_tab_index
          return (
            <div
              key={item.id}
              className={cn(styles.tabs__tab, {
                [styles['tabs__tab--active']]: is_active
              })}
              data-role="tab-item"
              data-index={i}
              onClick={props.handle_input_click}
            >
              <div className={styles['tabs__tab-icon']} />
            </div>
          )
        })}
        <div
          className={cn(styles.tabs__tab, styles['tabs__tab--new'])}
          data-role="tab-new"
          onClick={props.handle_input_click}
        >
          <div className={styles['tabs__tab-icon']} />
        </div>
        <div
          className={cn(styles.tabs__tab, styles['tabs__tab--close'])}
          data-role="tab-close"
          onClick={props.handle_input_click}
        >
          <div className={styles['tabs__tab-icon']} />
        </div>
      </ReactSortable>
    )
  }

  return null
})

Tabs.displayName = 'Tabs'
