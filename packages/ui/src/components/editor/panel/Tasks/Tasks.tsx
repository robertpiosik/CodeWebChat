import styles from './Tasks.module.scss'
import React, { useState } from 'react'
import { ReactSortable } from 'react-sortablejs'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Checkbox } from '../../common/Checkbox'
import { Textarea } from '../../common/Textarea'
import { use_periodic_re_render } from '../../../../hooks/use-periodic-re-render'
import cn from 'classnames'

dayjs.extend(relativeTime)

export type Task = {
  id: string
  text: string
  is_checked: boolean
  created_at: number
}

type Props = {
  tasks: Task[]
  on_reorder: (tasks: Task[]) => void
  on_change: (task: Task) => void
}

export const Tasks: React.FC<Props> = ({ tasks, on_reorder, on_change }) => {
  use_periodic_re_render(60 * 1000)
  const [editing_id, set_editing_id] = useState<string | null>(null)

  const handle_check_change = (task: Task, checked: boolean) => {
    on_change({ ...task, is_checked: checked })
  }

  const render_item = (task: Task) => {
    const is_editing = editing_id === task.id

    return (
      <div key={task.id} className={styles.item}>
        <div className={styles.item__left}>
          <Checkbox
            checked={task.is_checked}
            on_change={(checked) => handle_check_change(task, checked)}
          />
          <div className={styles['item__drag-handle']}>
            <span className="codicon codicon-gripper" />
          </div>
        </div>
        <div className={styles.item__right}>
          <div className={styles.item__header}>
            <span>{dayjs(task.created_at).fromNow()}</span>
            <span
              className={cn(
                'codicon',
                is_editing ? 'codicon-check' : 'codicon-edit',
                styles.item__edit
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => set_editing_id(is_editing ? null : task.id)}
              title={is_editing ? 'Save task' : 'Edit task'}
            />
          </div>
          {is_editing ? (
            <Textarea
              value={task.text}
              on_change={(value) => on_change({ ...task, text: value })}
              autofocus
              on_blur={() => set_editing_id(null)}
              on_key_down={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  set_editing_id(null)
                }
              }}
            />
          ) : (
            <div
              className={cn(styles.item__text, {
                [styles['item__text--checked']]: task.is_checked,
                [styles['item__text--placeholder']]: !task.text
              })}
              onClick={() => set_editing_id(task.id)}
            >
              {task.text || 'Double click to add text...'}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <ReactSortable
      list={tasks}
      setList={on_reorder}
      handle={`.${styles['item__drag-handle']}`}
      className={styles.tasks}
      animation={150}
    >
      {tasks.map(render_item)}
    </ReactSortable>
  )
}
