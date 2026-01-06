import * as fs from 'fs'
import * as path from 'path'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveTasksMessage } from '@/views/panel/types/messages'

const GLOBAL_TASKS_FILENAME = 'tasks.json'

export const handle_save_tasks = async (
  panel_provider: PanelProvider,
  message: SaveTasksMessage
): Promise<void> => {
  const file_path = path.join(
    panel_provider.context.globalStorageUri.fsPath,
    GLOBAL_TASKS_FILENAME
  )
  const dir_path = path.dirname(file_path)

  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true })
  }

  let all_data: Record<string, any> = {}

  try {
    if (fs.existsSync(file_path)) {
      const content = fs.readFileSync(file_path, 'utf8')
      all_data = JSON.parse(content)
    }
  } catch (error) {
    console.error('Error loading global tasks:', error)
  }

  all_data = {
    ...all_data,
    ...message.tasks
  }

  try {
    fs.writeFileSync(file_path, JSON.stringify(all_data, null, 2), 'utf8')
  } catch (error) {
    console.error('Failed to save tasks', error)
  }
}