import { Task } from '@shared/types/task'

const update_task_in_tree = (tasks: Task[], updated_task: Task): Task[] => {
  return tasks.map((t) => {
    if (t.created_at === updated_task.created_at) {
      return updated_task
    }
    if (t.children) {
      return { ...t, children: update_task_in_tree(t.children, updated_task) }
    }
    return t
  })
}

const add_subtask_to_tree = (
  tasks: Task[],
  parent_task: Task,
  new_task: Task
): Task[] => {
  return tasks.map((t) => {
    if (t.created_at === parent_task.created_at) {
      return {
        ...t,
        children: [...(t.children || []), new_task],
        is_collapsed: false
      }
    }
    if (t.children) {
      return {
        ...t,
        children: add_subtask_to_tree(t.children, parent_task, new_task)
      }
    }
    return t
  })
}

export const use_tasks = (
  on_tasks_change: (root: string, tasks: Task[]) => void,
  on_task_delete: (root: string, timestamp: number) => void,
  on_task_forward: (text: string) => void
) => {
  const handle_reorder = (root: string, new_tasks: Task[]) => {
    on_tasks_change(root, new_tasks)
  }

  const handle_change = (root: string, tasks: Task[], updated_task: Task) => {
    on_tasks_change(root, update_task_in_tree(tasks, updated_task))
  }

  const handle_add = (
    root: string,
    tasks: Task[],
    placement: 'top' | 'bottom' = 'bottom'
  ) => {
    const new_task: Task = {
      text: '',
      is_checked: false,
      created_at: Date.now(),
      children: []
    }
    const new_list =
      placement === 'top' ? [new_task, ...tasks] : [...tasks, new_task]
    on_tasks_change(root, new_list)
  }

  const handle_add_subtask = (
    root: string,
    tasks: Task[],
    parent_task: Task
  ) => {
    const new_task: Task = {
      text: '',
      is_checked: false,
      created_at: Date.now(),
      children: []
    }
    on_tasks_change(root, add_subtask_to_tree(tasks, parent_task, new_task))
  }

  const handle_delete = (root: string, timestamp: number) => {
    on_task_delete(root, timestamp)
  }

  const handle_forward = (text: string) => {
    on_task_forward(text)
  }

  return {
    handle_reorder,
    handle_change,
    handle_add,
    handle_add_subtask,
    handle_delete,
    handle_forward
  }
}
