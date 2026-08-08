import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { DeleteTaskMessage } from '@/views/prompt/types/messages'
import { Task } from '@shared/types/task'
import { TasksUtils } from '@/utils/tasks-utils'
import { t } from '@/i18n'

export const handle_delete_task = async (
  prompt_view_provider: PromptViewProvider,
  message: DeleteTaskMessage
): Promise<void> => {
  const broadcast_tasks = (all_data: Record<string, Task[]>) => {
    const workspace_roots =
      prompt_view_provider.workspace_provider.get_workspace_roots()
    const tasks: Record<string, Task[]> = {}
    for (const root of workspace_roots) {
      tasks[root] = all_data[root] || []
    }
    prompt_view_provider.send_message({
      command: 'TASKS',
      tasks
    })
  }

  let all_data = TasksUtils.load_all(prompt_view_provider.extension_context)
  const root_tasks = all_data[message.root] || []
  const task_info = TasksUtils.find_in_tree_with_location({
    tasks: root_tasks,
    id: message.timestamp
  })

  if (!task_info) {
    return
  }

  const new_root_tasks = TasksUtils.delete_from_tree({
    tasks: root_tasks,
    timestamp: message.timestamp
  })
  all_data[message.root] = new_root_tasks
  TasksUtils.save_all({
    extension_context: prompt_view_provider.extension_context,
    tasks: all_data
  })
  broadcast_tasks(all_data)

  const is_empty = (task: Task): boolean => {
    if (task.text.trim().length > 0) return false
    return (task.children || []).every(is_empty)
  }

  if (is_empty(task_info.task)) {
    return
  }

  const selection = await vscode.window.showInformationMessage(
    t('views.prompt.handlers.delete-task.task-deleted'),
    t('common.undo')
  )

  if (selection == t('common.undo')) {
    all_data = TasksUtils.load_all(prompt_view_provider.extension_context)
    const current_root_tasks = all_data[message.root] || []

    const result = TasksUtils.insert_in_tree({
      tasks: current_root_tasks,
      task: task_info.task,
      parent_id: task_info.parent_id,
      index: task_info.index
    })

    if (result.success) {
      all_data[message.root] = result.tasks
    } else {
      all_data[message.root] = [...current_root_tasks, task_info.task]
    }

    TasksUtils.save_all({
      extension_context: prompt_view_provider.extension_context,
      tasks: all_data
    })
    broadcast_tasks(all_data)
  }
}
