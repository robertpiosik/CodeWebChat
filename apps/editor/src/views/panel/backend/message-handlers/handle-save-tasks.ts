import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveTasksMessage } from '@/views/panel/types/messages'
import { load_all_tasks, save_all_tasks } from '@/utils/tasks-utils'

export const handle_save_tasks = async (
  panel_provider: PanelProvider,
  message: SaveTasksMessage
): Promise<void> => {
  let all_data = load_all_tasks(panel_provider.context)

  all_data = {
    ...all_data,
    ...message.tasks
  }

  save_all_tasks(panel_provider.context, all_data)
}
