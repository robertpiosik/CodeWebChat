import { useState } from 'react'
import { Task, Tasks } from './Tasks'

export default {
  component: Tasks
}

const initialTasks: Task[] = [
  {
    id: '1',
    text: 'Refactor the authentication middleware',
    is_checked: false,
    created_at: Date.now() - 1000 * 60 * 5 // 5 mins ago
  },
  {
    id: '2',
    text: 'Fix bug in user profile update',
    is_checked: true,
    created_at: Date.now() - 1000 * 60 * 60 * 2 // 2 hours ago
  },
  {
    id: '3',
    text: '',
    is_checked: false,
    created_at: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
  }
]

export const Default = () => {
  const [tasks, set_tasks] = useState(initialTasks)

  const handle_change = (updated_task: Task) => {
    set_tasks((prev) =>
      prev.map((t) => (t.id === updated_task.id ? updated_task : t))
    )
  }

  const handle_reorder = (new_tasks: Task[]) => {
    set_tasks(new_tasks)
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
      />
    </div>
  )
}

export const NoReorder = () => {
  const [tasks, set_tasks] = useState(initialTasks)

  const handle_change = (updated_task: Task) => {
    set_tasks((prev) =>
      prev.map((t) => (t.id === updated_task.id ? updated_task : t))
    )
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--vscode-sideBar-background)',
        padding: '20px'
      }}
    >
      <Tasks tasks={tasks} on_change={handle_change} on_reorder={() => {}} />
    </div>
  )
}
