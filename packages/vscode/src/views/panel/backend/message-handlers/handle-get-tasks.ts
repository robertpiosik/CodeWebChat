import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { Task } from '@shared/types/task'
import { load_all_tasks } from '@/utils/tasks-utils'

export const handle_get_tasks = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const workspace_roots = panel_provider.workspace_provider.getWorkspaceRoots()
  const all_data = load_all_tasks(panel_provider.context)

  const tasks: Record<string, Task[]> = {}

  for (const root of workspace_roots) {
    tasks[root] = all_data[root] || []
  }

  panel_provider.send_message({
    command: 'TASKS',
    tasks
  })
}
