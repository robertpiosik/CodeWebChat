import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { SaveTasksMessage } from '@/views/prompt/types/messages'
import { TasksUtils } from '@/utils/tasks-utils'

export const handle_save_tasks = async (
  prompt_view_provider: PromptViewProvider,
  message: SaveTasksMessage
): Promise<void> => {
  let all_data = TasksUtils.load_all(prompt_view_provider.extension_context)

  all_data = {
    ...all_data,
    ...message.tasks
  }

  TasksUtils.save_all({
    extension_context: prompt_view_provider.extension_context,
    tasks: all_data
  })
}
