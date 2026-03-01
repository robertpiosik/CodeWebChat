import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveTasksMessage } from '@/views/panel/types/messages'
import { TasksUtils } from '@/utils/tasks-utils'

export const handle_save_tasks = async (
  panel_provider: PanelProvider,
  message: SaveTasksMessage
): Promise<void> => {
  let all_data = TasksUtils.load_all(panel_provider.context)

  all_data = {
    ...all_data,
    ...message.tasks
  }

  TasksUtils.save_all({ context: panel_provider.context, tasks: all_data })
}
