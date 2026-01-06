import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { DeleteTaskMessage } from '@/views/panel/types/messages'
import { Task } from '@shared/types/task'
import { dictionary } from '@shared/constants/dictionary'

const GLOBAL_TASKS_FILENAME = 'tasks.json'

const delete_task_from_tree = (
  tasks: Task[],
  timestamp: number
): Task[] => {
  return tasks
    .filter((t) => t.created_at !== timestamp)
    .map((t) => ({
      ...t,
      children: t.children ? delete_task_from_tree(t.children, timestamp) : []
    }))
}

const find_task_in_tree_with_location = (
  tasks: Task[],
  id: number,
  parent_id: number | null = null
): { task: Task; parent_id: number | null; index: number } | null => {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].created_at === id) {
      return { task: tasks[i], parent_id, index: i }
    }
    if (tasks[i].children) {
      const result = find_task_in_tree_with_location(
        tasks[i].children!,
        id,
        tasks[i].created_at
      )
      if (result) return result
    }
  }
  return null
}

const insert_task_in_tree = (
  tasks: Task[],
  task: Task,
  parent_id: number | null,
  index: number
): { tasks: Task[]; success: boolean } => {
  if (parent_id === null) {
    const new_tasks = [...tasks]
    if (index >= 0 && index <= new_tasks.length) {
      new_tasks.splice(index, 0, task)
    } else {
      new_tasks.push(task)
    }
    return { tasks: new_tasks, success: true }
  }

  let success = false
  const new_tasks = tasks.map((t) => {
    if (t.created_at === parent_id) {
      success = true
      const new_children = t.children ? [...t.children] : []
      if (index >= 0 && index <= new_children.length) {
        new_children.splice(index, 0, task)
      } else {
        new_children.push(task)
      }
      return { ...t, children: new_children }
    }
    if (t.children) {
      const result = insert_task_in_tree(t.children, task, parent_id, index)
      if (result.success) {
        success = true
        return { ...t, children: result.tasks }
      }
    }
    return t
  })
  return { tasks: new_tasks, success }
}

export const handle_delete_task = async (
  panel_provider: PanelProvider,
  message: DeleteTaskMessage
): Promise<void> => {
  const file_path = path.join(
    panel_provider.context.globalStorageUri.fsPath,
    GLOBAL_TASKS_FILENAME
  )

  const load_all_data = (): Record<string, Task[]> => {
    try {
      if (fs.existsSync(file_path)) {
        const content = fs.readFileSync(file_path, 'utf8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Error loading global tasks:', error)
    }
    return {}
  }

  const save_all_data = (data: Record<string, Task[]>) => {
    try {
      fs.writeFileSync(file_path, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      console.error('Failed to save tasks', error)
    }
  }

  const broadcast_tasks = (all_data: Record<string, Task[]>) => {
    const workspace_roots =
      panel_provider.workspace_provider.getWorkspaceRoots()
    const tasks: Record<string, Task[]> = {}
    for (const root of workspace_roots) {
      tasks[root] = all_data[root] || []
    }
    panel_provider.send_message({
      command: 'TASKS',
      tasks
    })
  }

  // 1. Load and Find
  let all_data = load_all_data()
  const root_tasks = all_data[message.root] || []
  const task_info = find_task_in_tree_with_location(
    root_tasks,
    message.timestamp
  )

  if (!task_info) {
    return
  }

  // 2. Delete
  const new_root_tasks = delete_task_from_tree(root_tasks, message.timestamp)
  all_data[message.root] = new_root_tasks
  save_all_data(all_data)
  broadcast_tasks(all_data)

  // 3. Undo prompt
  const selection = await vscode.window.showInformationMessage(
    dictionary.information_message.TASK_DELETED,
    'Undo'
  )

  if (selection === 'Undo') {
    // 4. Restore
    all_data = load_all_data() // Reload to get latest state
    const current_root_tasks = all_data[message.root] || []

    const result = insert_task_in_tree(
      current_root_tasks,
      task_info.task,
      task_info.parent_id,
      task_info.index
    )

    if (result.success) {
      all_data[message.root] = result.tasks
    } else {
      // Parent not found, insert at root
      all_data[message.root] = [...current_root_tasks, task_info.task]
    }

    save_all_data(all_data)
    broadcast_tasks(all_data)
  }
}