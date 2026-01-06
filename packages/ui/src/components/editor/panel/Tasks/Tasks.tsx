import styles from './Tasks.module.scss'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { SimpleCheckbox } from '../../common/SimpleCheckbox'
import { Textarea } from '../../common/Textarea'
import { use_periodic_re_render } from '../../../../hooks/use-periodic-re-render'
import cn from 'classnames'
import { Task } from '@shared/types/task'
import { IconButton } from '../IconButton'
import { TaskGroup, SortableTask } from './components/TaskGroup'

dayjs.extend(relativeTime)

type Props = {
  tasks: Task[]
  on_reorder: (tasks: Task[]) => void
  on_change: (task: Task) => void
  on_add: () => void
  on_add_subtask?: (parent_task: Task) => void
  on_copy: (text: string) => void
  on_delete: (created_at: number) => void
}

const add_ids = (tasks: Task[]): SortableTask[] => {
  return tasks.map((t) => ({
    ...t,
    id: t.created_at,
    children: t.children ? add_ids(t.children) : []
  }))
}

const remove_ids = (tasks: SortableTask[]): Task[] => {
  return tasks.map(({ id, children, ...rest }) => ({
    ...rest,
    children: children ? remove_ids(children) : []
  }))
}

export const Tasks: React.FC<Props> = (props) => {
  use_periodic_re_render(60 * 1000)
  const [editing_timestamp, set_editing_timestamp] = useState<number | null>(
    null
  )
  const [last_copied_timestamp, set_last_copied_timestamp] = useState<
    number | null
  >(null)
  const prevent_edit_ref = useRef(false)

  const tree = useMemo(() => add_ids(props.tasks), [props.tasks])

  const handle_tree_reorder = (new_tree: SortableTask[]) => {
    props.on_reorder(remove_ids(new_tree))
  }

  const handle_check_change = (task: Task, checked: boolean) => {
    const { id, ...rest } = task as any
    props.on_change({ ...rest, is_checked: checked })
  }

  const render_item = (
    task: Task,
    is_visually_checked: boolean,
    depth: number
  ) => {
    const is_editing = editing_timestamp == task.created_at
    const is_copied = last_copied_timestamp == task.created_at
    const has_children = task.children && task.children.length > 0

    const checked_children_count = has_children
      ? task.children!.filter((child) => child.is_checked).length
      : 0

    return (
      <div
        className={cn(styles.item, {
          [styles['item--copied']]: is_copied
        })}
        style={{ paddingLeft: `${10 + depth * 20}px` }}
      >
        {[...Array(depth)].map((_, i) => (
          <div
            key={i}
            className={styles['indent-guide']}
            style={{ left: `${19 + i * 20}px` }}
          />
        ))}
        <div className={styles.item__left}>
          <SimpleCheckbox
            checked={task.is_checked}
            on_change={(checked) => handle_check_change(task, checked)}
          />

          <button
            className={cn(
              styles['add-button'],
              has_children
                ? task.is_collapsed
                  ? styles['add-button--expand']
                  : styles['add-button--collapse']
                : styles['add-button--indent']
            )}
            onClick={(e) => {
              e.stopPropagation()
              if (has_children) {
                const { id, ...rest } = task as SortableTask
                props.on_change({
                  ...rest,
                  is_collapsed: !task.is_collapsed
                })
              } else {
                props.on_add_subtask?.(task)
              }
            }}
            title={
              has_children
                ? task.is_collapsed
                  ? 'Expand'
                  : 'Collapse'
                : 'Add subtask'
            }
          />
        </div>

        <div className={styles.item__right}>
          <div className={styles.item__header}>
            <div className={styles['item__header-left']}>
              <span
                className={cn(styles.item__time, {
                  [styles['item__time--checked']]: is_visually_checked
                })}
              >
                {dayjs(task.created_at).fromNow()}
                {has_children &&
                  ` · ${checked_children_count}/${task.children!.length}`}
              </span>
            </div>
            <div
              className={cn(styles.item__actions, {
                [styles['item__actions--visible']]: is_editing
              })}
            >
              {task.text && (
                <IconButton
                  codicon_icon="copy"
                  on_click={(e) => {
                    e.stopPropagation()
                    props.on_copy(task.text)
                    set_last_copied_timestamp(task.created_at)
                  }}
                  title="Copy Task"
                />
              )}
              <IconButton
                codicon_icon={is_editing ? 'check' : 'edit'}
                on_mouse_down={
                  is_editing ? (e) => e.preventDefault() : undefined
                }
                on_click={() =>
                  set_editing_timestamp(is_editing ? null : task.created_at)
                }
                title={is_editing ? 'Save task' : 'Edit task'}
              />
              <IconButton
                codicon_icon="trash"
                on_click={(e) => {
                  e.stopPropagation()
                  props.on_delete(task.created_at)
                }}
                title="Delete task"
              />
            </div>
          </div>

          {is_editing ? (
            <Textarea
              value={task.text}
              on_change={(value) => {
                const { id, ...rest } = task as any
                props.on_change({ ...rest, text: value })
              }}
              autofocus
              on_blur={() => set_editing_timestamp(null)}
              on_key_down={(e) => {
                if (e.key == 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  set_editing_timestamp(null)
                }
              }}
            />
          ) : (
            <div
              className={cn(styles.item__text, {
                [styles['item__text--checked']]: is_visually_checked,
                [styles['item__text--placeholder']]: !task.text
              })}
              onMouseDown={() => {
                if (
                  editing_timestamp !== null &&
                  editing_timestamp !== task.created_at
                ) {
                  prevent_edit_ref.current = true
                  setTimeout(() => {
                    prevent_edit_ref.current = false
                  }, 200)
                }
              }}
              onClick={() => {
                if (prevent_edit_ref.current) return
                set_editing_timestamp(task.created_at)
              }}
            >
              {task.text || 'Click to add text...'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <TaskGroup
        items={tree}
        on_reorder={handle_tree_reorder}
        render_item={render_item}
        className={styles.tasks}
        on_add={props.on_add}
        get_on_add_subtask={(parent) => () => props.on_add_subtask?.(parent)}
      />
    </div>
  )
}
