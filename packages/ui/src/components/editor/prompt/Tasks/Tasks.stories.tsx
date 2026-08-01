import { useState } from 'react'
import { Tasks } from './Tasks'
import { Task } from '@shared/types/task'

export default {
  component: Tasks
}

const initialTasks: Task[] = [
  {
    text: 'Refactor the authentication middleware',
    is_checked: false,
    created_at: Date.now() - 1000 * 60 * 5, // 5 mins ago
    children: [
      {
        text: 'Implement JWT rotation',
        is_checked: false,
        created_at: Date.now() - 1000 * 60 * 4,
        children: []
      },
      {
        text: 'Update login flow',
        is_checked: false,
        created_at: Date.now() - 1000 * 60 * 3,
        children: [
          {
            text: 'Test with social providers',
            is_checked: false,
            created_at: Date.now() - 1000 * 60 * 2,
            children: []
          }
        ]
      }
    ]
  },
  {
    text: 'Fix bug in user profile update',
    is_checked: true,
    created_at: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    children: [
      {
        text: 'Write unit tests for the fix',
        is_checked: true,
        created_at: Date.now() - 1000 * 60 * 60,
        children: []
      }
    ]
  },
  {
    text: '',
    is_checked: false,
    created_at: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    children: []
  }
]

const update_in_tree = (tasks: Task[], updated: Task): Task[] => {
  return tasks.map((t) => {
    if (t.created_at === updated.created_at)
      return { ...updated, children: t.children }
    if (t.children)
      return { ...t, children: update_in_tree(t.children, updated) }
    return t
  })
}

const add_subtask_in_tree = (
  tasks: Task[],
  parent_id: number,
  new_task: Task
): Task[] => {
  return tasks.map((t) => {
    if (t.created_at === parent_id) {
      return {
        ...t,
        children: [...(t.children || []), new_task],
        is_collapsed: false
      }
    }
    if (t.children) {
      return {
        ...t,
        children: add_subtask_in_tree(t.children, parent_id, new_task)
      }
    }
    return t
  })
}

const delete_from_tree = (tasks: Task[], id: number): Task[] => {
  return tasks
    .filter((t) => t.created_at !== id)
    .map((t) => ({
      ...t,
      children: t.children ? delete_from_tree(t.children, id) : []
    }))
}

export const Default = () => {
  const [tasks, set_tasks] = useState(initialTasks)

  const handle_change = (updated_task: Task) => {
    set_tasks((prev) => update_in_tree(prev, updated_task))
  }

  const handle_reorder = (new_tasks: Task[]) => {
    set_tasks(new_tasks)
  }

  const handle_add = () => {
    const new_task: Task = {
      text: '',
      is_checked: false,
      created_at: Date.now(),
      children: []
    }
    set_tasks((prev) => [...prev, new_task])
  }

  const handle_add_subtask = (parent_task: Task) => {
    const new_task: Task = {
      text: '',
      is_checked: false,
      created_at: Date.now(),
      children: []
    }
    set_tasks((prev) =>
      add_subtask_in_tree(prev, parent_task.created_at, new_task)
    )
  }

  const handle_delete = (created_at: number) => {
    set_tasks((prev) => delete_from_tree(prev, created_at))
  }

  const handle_copy = (text: string) => {
    console.log('Copied task:', text)
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--vscode-sideBar-background)',
        padding: '20px'
      }}
    >
      <Tasks
        tasks={tasks}
        on_change={handle_change}
        on_reorder={handle_reorder}
        on_add={handle_add}
        on_add_subtask={handle_add_subtask}
        on_delete={handle_delete}
        on_forward={() => {}}
        placeholder="Click to add text..."
      />
    </div>
  )
}

export const NoReorder = () => {
  const [tasks, set_tasks] = useState(initialTasks)

  const handle_change = (updated_task: Task) => {
    set_tasks((prev) => update_in_tree(prev, updated_task))
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--vscode-sideBar-background)',
        padding: '20px'
      }}
    >
      <Tasks
        tasks={tasks}
        on_change={handle_change}
        on_reorder={() => {}}
        on_add={() => {}}
        on_add_subtask={() => {}}
        on_delete={() => {}}
        on_forward={() => {}}
        placeholder="Click to add text..."
      />
    </div>
  )
}
