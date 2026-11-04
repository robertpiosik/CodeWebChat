import { PromptViewProvider } from '../prompt-view-provider'
import {
  COMPLETED_TASKS_STATE_KEY,
  INSTRUCTIONS_ASK_STATE_KEY,
  INSTRUCTIONS_EDIT_FILES_STATE_KEY
} from '@/constants/state-keys'
import * as vscode from 'vscode'
import { t } from '@/i18n'
import { SaveCompletedTasksMessage } from '@/views/prompt/types/messages'

export const handle_save_completed_tasks = async (
  prompt_view_provider: PromptViewProvider,
  message: SaveCompletedTasksMessage
) => {
  const instruction = message.task
  const prompt_type = prompt_view_provider.prompt_type
  if (instruction) {
    prompt_view_provider.completed_tasks = [
      ...prompt_view_provider.completed_tasks,
      instruction
    ]
    await prompt_view_provider.extension_context.workspaceState.update(
      COMPLETED_TASKS_STATE_KEY,
      prompt_view_provider.completed_tasks
    )
    prompt_view_provider.send_message({
      command: 'COMPLETED_TASKS',
      completed_tasks: prompt_view_provider.completed_tasks
    })

    const selection = await vscode.window.showInformationMessage(
      t('views.prompt.handlers.handle-save-completed-tasks.task-completed'),
      t('common.undo')
    )

    if (selection === t('common.undo')) {
      prompt_view_provider.completed_tasks =
        prompt_view_provider.completed_tasks.slice(0, -1)
      await prompt_view_provider.extension_context.workspaceState.update(
        COMPLETED_TASKS_STATE_KEY,
        prompt_view_provider.completed_tasks
      )
      prompt_view_provider.send_message({
        command: 'COMPLETED_TASKS',
        completed_tasks: prompt_view_provider.completed_tasks
      })

      const active_state = prompt_view_provider.active_instructions_state
      active_state.instructions[active_state.active_index] = instruction

      const state_key =
        prompt_type === 'ask'
          ? INSTRUCTIONS_ASK_STATE_KEY
          : INSTRUCTIONS_EDIT_FILES_STATE_KEY

      await prompt_view_provider.extension_context.workspaceState.update(
        state_key,
        active_state
      )

      prompt_view_provider.send_message({
        command: 'INSTRUCTIONS',
        ask_about_context: prompt_view_provider.ask_about_context_instructions,
        edit_files: prompt_view_provider.edit_files_instructions,
        caret_position: instruction.length
      })
      prompt_view_provider.caret_position = instruction.length
      prompt_view_provider.send_token_count()
      prompt_view_provider.send_message({
        command: 'FOCUS_PROMPT_FIELD'
      })
    }
  } else {
    vscode.window.showInformationMessage(
      t('views.common.handlers.common.instructions-cannot-be-empty')
    )
  }
}
