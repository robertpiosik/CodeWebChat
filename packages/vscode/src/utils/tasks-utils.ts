import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Task } from '@shared/types/task'

const GLOBAL_TASKS_FILENAME = 'tasks.json'

export const get_tasks_file_path = (context: vscode.ExtensionContext) => {
  return path.join(context.globalStorageUri.fsPath, GLOBAL_TASKS_FILENAME)
}

export const load_all_tasks = (
  context: vscode.ExtensionContext
): Record<string, Task[]> => {
  const file_path = get_tasks_file_path(context)
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

export const save_all_tasks = (
  context: vscode.ExtensionContext,
  tasks: Record<string, Task[]>
) => {
  const file_path = get_tasks_file_path(context)
  const dir_path = path.dirname(file_path)

  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true })
  }

  try {
    fs.writeFileSync(file_path, JSON.stringify(tasks, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to save tasks', error)
  }
}

export const delete_task_from_tree = (
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

export const find_task_in_tree_with_location = (
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

export const insert_task_in_tree = (
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

export const mark_task_as_completed_if_matches_prompt = (
  context: vscode.ExtensionContext,
  prompt_text: string
): Record<string, Task[]> | null => {
  if (!prompt_text.trim()) return null

  const all_tasks = load_all_tasks(context)
  if (Object.keys(all_tasks).length == 0) return null

  let file_changed = false
  const relevant_tasks: Record<string, Task[]> = {}

  const process_tasks = (tasks: Task[]) => {
    for (const task of tasks) {
      if (!task.is_checked && task.text.trim() == prompt_text.trim()) {
        task.is_checked = true
        file_changed = true
      }
      if (task.children) {
        process_tasks(task.children)
      }
    }
  }

  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach((folder) => {
      const tasks = all_tasks[folder.uri.fsPath]
      if (tasks) {
        process_tasks(tasks)
        relevant_tasks[folder.uri.fsPath] = tasks
      }
    })
  }

  if (file_changed) {
    save_all_tasks(context, all_tasks)
    return relevant_tasks
  }

  return null
}
