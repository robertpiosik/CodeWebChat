import styles from '../Tasks.module.scss'
import React from 'react'
import { ReactSortable } from 'react-sortablejs'
import cn from 'classnames'
import { Task } from '@shared/types/task'

export type SortableTask = Task & {
  id: number
  children: SortableTask[]
}

type TaskGroupProps = {
  items: SortableTask[]
  on_reorder: (items: SortableTask[]) => void
  render_item: (params: {
    task: Task
    is_visually_checked: boolean
    depth: number
  }) => React.ReactNode
  className?: string
  on_add?: () => void
  get_on_add_subtask?: (parent: Task) => () => void
  parent_checked?: boolean
  depth?: number
}

export const TaskGroup: React.FC<TaskGroupProps> = (props) => {
  const depth = props.depth ?? 0
  const parent_checked = props.parent_checked ?? false

  return (
    <>
      <ReactSortable<SortableTask>
        list={props.items}
        setList={props.on_reorder}
        className={props.className}
        animation={150}
        group="tasks"
      >
        {props.items.map((item) => {
          const is_visually_checked = parent_checked || item.is_checked
          return (
            <div key={item.id}>
              {props.render_item({ task: item, is_visually_checked, depth })}
              {item.children &&
                item.children.length > 0 &&
                !item.is_collapsed && (
                  <TaskGroup
                    items={item.children}
                    on_reorder={(new_children) => {
                      const new_items = props.items.map((i) =>
                        i.id === item.id ? { ...i, children: new_children } : i
                      )
                      props.on_reorder(new_items)
                    }}
                    render_item={props.render_item}
                    className={props.className}
                    on_add={
                      props.get_on_add_subtask
                        ? props.get_on_add_subtask(item)
                        : undefined
                    }
                    get_on_add_subtask={props.get_on_add_subtask}
                    parent_checked={is_visually_checked}
                    depth={depth + 1}
                  />
                )}
            </div>
          )
        })}
      </ReactSortable>
      {props.on_add && (
        <div className={styles['add-row']} onClick={props.on_add}>
          {[...Array(depth)].map((_, i) => (
            <div
              key={i}
              className={styles['indent-guide']}
              style={{ left: `${19 + i * 20}px` }}
            />
          ))}
          <button
            className={cn(styles['add-button'], styles['add-button--add'])}
            style={{ marginLeft: `${13 + depth * 20}px` }}
            title="Add task"
          />
        </div>
      )}
    </>
  )
}
