import * as fs from 'fs'
import * as path from 'path'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { Task } from '@shared/types/task'

const GLOBAL_TASKS_FILENAME = 'tasks.json'

export const handle_get_tasks = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const workspace_roots = panel_provider.workspace_provider.getWorkspaceRoots()

  const file_path = path.join(
    panel_provider.context.globalStorageUri.fsPath,
    GLOBAL_TASKS_FILENAME
  )

  let all_data: Record<string, Task[]> = {}

  try {
    if (fs.existsSync(file_path)) {
      const content = fs.readFileSync(file_path, 'utf8')
      all_data = JSON.parse(content)
    }
  } catch (error) {
    console.error('Error loading global tasks:', error)
  }

  const tasks: Record<string, Task[]> = {}

  for (const root of workspace_roots) {
    tasks[root] = all_data[root] || []
  }

  panel_provider.send_message({
    command: 'TASKS',
    tasks
  })
}