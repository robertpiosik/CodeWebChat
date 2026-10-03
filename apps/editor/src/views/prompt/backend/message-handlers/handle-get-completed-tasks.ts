import { PromptViewProvider } from '../prompt-view-provider'

export const handle_get_completed_tasks = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'COMPLETED_TASKS',
    completed_tasks: prompt_view_provider.completed_tasks
  })
}
