import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Task } from '@shared/types/task'

export namespace TasksUtils {
  const GLOBAL_TASKS_FILENAME = 'tasks.json'

  export const get_file_path = (params: {
    context: vscode.ExtensionContext
  }) => {
    return path.join(
      params.context.globalStorageUri.fsPath,
      GLOBAL_TASKS_FILENAME
    )
  }

  export const load_all = (
    context: vscode.ExtensionContext
  ): Record<string, Task[]> => {
    const file_path = get_file_path({ context })
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

  export const save_all = (params: {
    context: vscode.ExtensionContext
    tasks: Record<string, Task[]>
  }) => {
    const filtered_tasks: Record<string, Task[]> = {}

    for (const root in params.tasks) {
      if (fs.existsSync(root)) {
        filtered_tasks[root] = params.tasks[root]
      }
    }

    const file_path = get_file_path({ context: params.context })
    const dir_path = path.dirname(file_path)

    if (!fs.existsSync(dir_path)) {
      fs.mkdirSync(dir_path, { recursive: true })
    }

    try {
      fs.writeFileSync(
        file_path,
        JSON.stringify(filtered_tasks, null, 2),
        'utf8'
      )
    } catch (error) {
      console.error('Failed to save tasks', error)
    }
  }

  export const delete_from_tree = (params: {
    tasks: Task[]
    timestamp: number
  }): Task[] => {
    return params.tasks
      .filter((t) => t.created_at !== params.timestamp)
      .map((t) => ({
        ...t,
        children: t.children
          ? delete_from_tree({
              tasks: t.children,
              timestamp: params.timestamp
            })
          : []
      }))
  }

  export const find_in_tree_with_location = (params: {
    tasks: Task[]
    id: number
    parent_id?: number | null
  }): { task: Task; parent_id: number | null; index: number } | null => {
    const effective_parent_id =
      params.parent_id !== undefined ? params.parent_id : null
    for (let i = 0; i < params.tasks.length; i++) {
      if (params.tasks[i].created_at === params.id) {
        return {
          task: params.tasks[i],
          parent_id: effective_parent_id,
          index: i
        }
      }
      if (params.tasks[i].children) {
        const result = find_in_tree_with_location({
          tasks: params.tasks[i].children!,
          id: params.id,
          parent_id: params.tasks[i].created_at
        })
        if (result) return result
      }
    }
    return null
  }

  export const insert_in_tree = (params: {
    tasks: Task[]
    task: Task
    parent_id: number | null
    index: number
  }): { tasks: Task[]; success: boolean } => {
    if (params.parent_id === null) {
      const new_tasks = [...params.tasks]
      if (params.index >= 0 && params.index <= new_tasks.length) {
        new_tasks.splice(params.index, 0, params.task)
      } else {
        new_tasks.push(params.task)
      }
      return { tasks: new_tasks, success: true }
    }

    let success = false
    const new_tasks = params.tasks.map((t) => {
      if (t.created_at === params.parent_id) {
        success = true
        const new_children = t.children ? [...t.children] : []
        if (params.index >= 0 && params.index <= new_children.length) {
          new_children.splice(params.index, 0, params.task)
        } else {
          new_children.push(params.task)
        }
        return { ...t, children: new_children }
      }
      if (t.children) {
        const result = insert_in_tree({
          tasks: t.children,
          task: params.task,
          parent_id: params.parent_id,
          index: params.index
        })
        if (result.success) {
          success = true
          return { ...t, children: result.tasks }
        }
      }
      return t
    })
    return { tasks: new_tasks, success }
  }
}
