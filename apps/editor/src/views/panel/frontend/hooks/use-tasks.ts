import { useState, useEffect } from 'react'
import { Task } from '@shared/types/task'
import { BackendMessage } from '../../types/messages'
import { post_message } from '../utils/post_message'

export const use_tasks = (vscode: any) => {
  const [tasks, set_tasks] = useState<Record<string, Task[]>>({})
  const [are_tasks_collapsed, set_are_tasks_collapsed] = useState(false)

  const handle_tasks_change = (root: string, updated_tasks: Task[]) => {
    const new_tasks = { ...tasks, [root]: updated_tasks }
    set_tasks(new_tasks)
    post_message(vscode, {
      command: 'SAVE_TASKS',
      tasks: new_tasks
    })
  }

  const handle_task_delete = (root: string, timestamp: number) => {
    post_message(vscode, {
      command: 'DELETE_TASK',
      root,
      timestamp
    })
  }

  const handle_tasks_collapsed_change = (is_collapsed: boolean) => {
    set_are_tasks_collapsed(is_collapsed)
    post_message(vscode, {
      command: 'SAVE_COMPONENT_COLLAPSED_STATE',
      component: 'tasks',
      is_collapsed
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'TASKS') {
        set_tasks(message.tasks)
      } else if (message.command == 'COLLAPSED_STATES') {
        set_are_tasks_collapsed(message.are_tasks_collapsed)
      }
    }

    window.addEventListener('message', handle_message)
    post_message(vscode, { command: 'GET_TASKS' })

    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    tasks,
    are_tasks_collapsed,
    handle_tasks_change,
    handle_task_delete,
    handle_tasks_collapsed_change
  }
}
