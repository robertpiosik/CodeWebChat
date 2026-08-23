import { useState, useEffect } from 'react'
import { Task } from '@shared/types/task'
import { BackendMessage } from '../../../types/messages'
import { post_message } from '../../utils/post-message'

const update_task_in_tree = (params: {
  tasks: Task[]
  updated_task: Task
}): Task[] => {
  return params.tasks.map((t) => {
    if (t.created_at == params.updated_task.created_at) {
      return params.updated_task
    }
    if (t.children) {
      return {
        ...t,
        children: update_task_in_tree({
          tasks: t.children,
          updated_task: params.updated_task
        })
      }
    }
    return t
  })
}

const add_subtask_to_tree = (params: {
  tasks: Task[]
  parent_task: Task
  new_task: Task
}): Task[] => {
  return params.tasks.map((t) => {
    if (t.created_at == params.parent_task.created_at) {
      return {
        ...t,
        children: [...(t.children || []), params.new_task],
        is_collapsed: false
      }
    }
    if (t.children) {
      return {
        ...t,
        children: add_subtask_to_tree({
          tasks: t.children,
          parent_task: params.parent_task,
          new_task: params.new_task
        })
      }
    }
    return t
  })
}

export const use_tasks = (vscode: any) => {
  const [tasks, set_tasks] = useState<Record<string, Task[]>>({})

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

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'TASKS') {
        set_tasks(message.tasks)
      }
    }

    window.addEventListener('message', handle_message)
    post_message(vscode, { command: 'GET_TASKS' })

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_reorder = (root: string, new_tasks: Task[]) => {
    handle_tasks_change(root, new_tasks)
  }

  const handle_change = (
    root: string,
    root_tasks: Task[],
    updated_task: Task
  ) => {
    handle_tasks_change(
      root,
      update_task_in_tree({ tasks: root_tasks, updated_task })
    )
  }

  const handle_add = (root: string, root_tasks: Task[]) => {
    const new_task: Task = {
      text: '',
      is_checked: false,
      created_at: Date.now(),
      children: []
    }
    const new_list = [...root_tasks, new_task]
    handle_tasks_change(root, new_list)
  }

  const handle_add_subtask = (
    root: string,
    root_tasks: Task[],
    parent_task: Task
  ) => {
    const new_task: Task = {
      text: '',
      is_checked: false,
      created_at: Date.now(),
      children: []
    }
    handle_tasks_change(
      root,
      add_subtask_to_tree({ tasks: root_tasks, parent_task, new_task })
    )
  }

  const handle_delete = (root: string, timestamp: number) => {
    handle_task_delete(root, timestamp)
  }

  return {
    tasks,
    handle_reorder,
    handle_change,
    handle_add,
    handle_add_subtask,
    handle_delete
  }
}
