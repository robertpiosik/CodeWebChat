import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { Task } from '@shared/types/task'
import { TasksUtils } from '@/utils/tasks-utils'

export const handle_get_tasks = async (
  panel_view_provider: PanelViewProvider
): Promise<void> => {
  const workspace_roots =
    panel_view_provider.workspace_provider.get_workspace_roots()
  const all_data = TasksUtils.load_all(panel_view_provider.extension_context)

  const tasks: Record<string, Task[]> = {}

  for (const root of workspace_roots) {
    tasks[root] = all_data[root] || []
  }

  panel_view_provider.send_message({
    command: 'TASKS',
    tasks
  })
}
