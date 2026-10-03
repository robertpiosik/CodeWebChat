import { PromptViewProvider } from '../prompt-view-provider'
import { COMPLETED_TASKS_STATE_KEY } from '@/constants/state-keys'
import * as vscode from 'vscode'
import { t } from '@/i18n'

export const handle_clear_completed_tasks = async (
  prompt_view_provider: PromptViewProvider
) => {
  const original_completed_tasks = [...prompt_view_provider.completed_tasks]

  prompt_view_provider.completed_tasks = []
  await prompt_view_provider.extension_context.workspaceState.update(
    COMPLETED_TASKS_STATE_KEY,
    prompt_view_provider.completed_tasks
  )
  prompt_view_provider.send_message({
    command: 'COMPLETED_TASKS',
    completed_tasks: prompt_view_provider.completed_tasks
  })

  const selection = await vscode.window.showInformationMessage(
    t('views.prompt.handlers.handle-clear-completed-tasks.cleared'),
    t('common.undo')
  )

  if (selection === t('common.undo')) {
    prompt_view_provider.completed_tasks = original_completed_tasks
    await prompt_view_provider.extension_context.workspaceState.update(
      COMPLETED_TASKS_STATE_KEY,
      prompt_view_provider.completed_tasks
    )
    prompt_view_provider.send_message({
      command: 'COMPLETED_TASKS',
      completed_tasks: prompt_view_provider.completed_tasks
    })
  }
}
