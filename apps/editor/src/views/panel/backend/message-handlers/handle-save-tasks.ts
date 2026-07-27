import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { SaveTasksMessage } from '@/views/panel/types/messages'
import { TasksUtils } from '@/utils/tasks-utils'

export const handle_save_tasks = async (
  panel_view_provider: PanelViewProvider,
  message: SaveTasksMessage
): Promise<void> => {
  let all_data = TasksUtils.load_all(panel_view_provider.extension_context)

  all_data = {
    ...all_data,
    ...message.tasks
  }

  TasksUtils.save_all({
    extension_context: panel_view_provider.extension_context,
    tasks: all_data
  })
}
