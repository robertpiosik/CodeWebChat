import React, { useRef, useEffect, useState } from 'react'
import cn from 'classnames'
import styles from './CompletedTasks.module.scss'
import { Checkbox } from '../../../../Checkbox/Checkbox'
import { get_highlighted_text } from '../../../shared/symbols'
import { Button } from '../../../../Button/Button'

type TaskProps = {
  task: string
  selected_files?: string[]
  is_web_target?: boolean
}

export const CompletedTask: React.FC<TaskProps> = ({
  task,
  selected_files,
  is_web_target
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = get_highlighted_text({
        text: task,
        context_file_paths: selected_files ?? [],
        is_web_target
      })
    }
  }, [task, selected_files, is_web_target])

  return (
    <div className={styles['completed-task']}>
      <div className={styles['completed-task__checkbox']}>
        <Checkbox checked={true} on_change={() => {}} />
      </div>
      <div ref={ref} className={styles['completed-task__text']} />
    </div>
  )
}

type Props = {
  tasks: string[]
  selected_files?: string[]
  is_web_target?: boolean
  on_clear_completed_tasks?: () => void
  translations: {
    completed_tasks: string
    completed_task: string
    clear_session: string
  }
  is_expanded: boolean
  set_is_expanded: (is_expanded: boolean) => void
}

export const CompletedTasks: React.FC<Props> = ({
  tasks,
  selected_files,
  is_web_target,
  on_clear_completed_tasks,
  translations,
  is_expanded,
  set_is_expanded
}) => {
  if (tasks.length === 0) {
    return null
  }

  return (
    <>
      <div
        className={cn(styles['header'], {
          [styles['header--expanded']]: is_expanded
        })}
        onClick={() => set_is_expanded(!is_expanded)}
      >
        <div className={styles['header__left']}>
          <div
            className={cn(styles['header__icon'], {
              [styles['header__icon--expanded']]: is_expanded
            })}
          />
          <div className={styles['header__text']}>
            {tasks.length}{' '}
            {tasks.length === 1
              ? translations.completed_task
              : translations.completed_tasks}
          </div>
        </div>
        {on_clear_completed_tasks && (
          <div className={styles['header__right']}>
            <Button
              is_small
              is_secondary
              on_click={(e) => {
                e.stopPropagation()
                on_clear_completed_tasks()
              }}
            >
              {translations.clear_session}
            </Button>
          </div>
        )}
      </div>
      {is_expanded && (
        <div
          className={styles['tasks-list']}
          onClick={() => set_is_expanded(false)}
        >
          {[...tasks].reverse().map((task, idx) => (
            <CompletedTask
              key={idx}
              task={task}
              selected_files={selected_files}
              is_web_target={is_web_target}
            />
          ))}
        </div>
      )}
    </>
  )
}
