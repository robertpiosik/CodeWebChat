import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ReactSortable } from 'react-sortablejs'
import cn from 'classnames'
import styles from '../../PromptField.module.scss'

type Props = {
  tabs_count: number
  active_tab_index: number
  on_tabs_reorder?: (new_order: number[]) => void
  handle_input_click?: (e: React.MouseEvent<HTMLDivElement>) => void
  is_empty?: boolean
}

export type TabsRef = {
  handle_mouse_leave: () => void
}

export const Tabs = forwardRef<TabsRef, Props>((props, ref) => {
  const [tab_items, set_tab_items] = useState<{ id: string }[]>([])
  const [has_left_active_tab, set_has_left_active_tab] = useState(true)
  const [hovered_tab_index, set_hovered_tab_index] = useState<number | null>(
    null
  )
  const [prev_active_tab_index_state, set_prev_active_tab_index_state] =
    useState(props.active_tab_index)
  const [prev_tabs_count_state, set_prev_tabs_count_state] = useState(
    props.tabs_count
  )

  useImperativeHandle(ref, () => ({
    handle_mouse_leave: () => {
      set_has_left_active_tab(true)
      set_hovered_tab_index(null)
    }
  }))

  let effective_has_left_active_tab = has_left_active_tab
  if (
    prev_active_tab_index_state !== props.active_tab_index ||
    prev_tabs_count_state !== props.tabs_count
  ) {
    if (prev_tabs_count_state > props.tabs_count) {
      effective_has_left_active_tab = false
    } else {
      effective_has_left_active_tab =
        hovered_tab_index !== props.active_tab_index
    }
    set_has_left_active_tab(effective_has_left_active_tab)
    set_prev_active_tab_index_state(props.active_tab_index)
    set_prev_tabs_count_state(props.tabs_count)
  }

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
        filter={`.${styles['tabs__tab--new']}`}
      >
        {tab_items.map((item, i) => {
          const is_active = i === props.active_tab_index
          const is_hovered = hovered_tab_index === i
          const can_close = !(props.tabs_count === 1 && props.is_empty)
          const show_close =
            is_active &&
            is_hovered &&
            effective_has_left_active_tab &&
            can_close
          return (
            <div
              key={item.id}
              className={cn(styles.tabs__tab, {
                [styles['tabs__tab--active']]: is_active,
                [styles['tabs__tab--show-close']]: show_close
              })}
              data-role="tab-item"
              data-index={i}
              onClick={props.handle_input_click}
              onMouseEnter={() => set_hovered_tab_index(i)}
              onMouseLeave={() => {
                set_hovered_tab_index(null)
                if (is_active) {
                  set_has_left_active_tab(true)
                }
              }}
            >
              <div className={styles['tabs__tab-icon']} />
            </div>
          )
        })}
        <div
          className={cn(styles.tabs__tab, styles['tabs__tab--new'])}
          data-role="tab-new"
          onClick={props.handle_input_click}
        />
      </ReactSortable>
    )
  }

  return null
})

Tabs.displayName = 'Tabs'
