import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { DeleteTaskMessage } from '@/views/panel/types/messages'
import { Task } from '@shared/types/task'
import { dictionary } from '@shared/constants/dictionary'
import {
  load_all_tasks,
  save_all_tasks,
  find_task_in_tree_with_location,
  delete_task_from_tree,
  insert_task_in_tree
} from '@/utils/tasks-utils'

export const handle_delete_task = async (
  panel_provider: PanelProvider,
  message: DeleteTaskMessage
): Promise<void> => {
  const broadcast_tasks = (all_data: Record<string, Task[]>) => {
    const workspace_roots =
      panel_provider.workspace_provider.get_workspace_roots()
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
  let all_data = load_all_tasks(panel_provider.context)
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
  save_all_tasks(panel_provider.context, all_data)
  broadcast_tasks(all_data)

  const is_empty = (task: Task): boolean => {
    if (task.text.trim().length > 0) return false
    return (task.children || []).every(is_empty)
  }

  if (is_empty(task_info.task)) {
    return
  }

  // 3. Undo prompt
  const selection = await vscode.window.showInformationMessage(
    dictionary.information_message.TASK_DELETED,
    'Undo'
  )

  if (selection === 'Undo') {
    // 4. Restore
    all_data = load_all_tasks(panel_provider.context) // Reload to get latest state
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

    save_all_tasks(panel_provider.context, all_data)
    broadcast_tasks(all_data)
  }
}
