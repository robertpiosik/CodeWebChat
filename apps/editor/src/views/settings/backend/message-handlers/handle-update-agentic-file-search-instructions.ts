import * as vscode from 'vscode'
import { ai_file_search_task_instructions } from '@/constants/instructions'
import { UpdateAgenticFileSearchInstructionsMessage } from '../../types/messages'

export const handle_update_agentic_file_search_instructions = async (
  message: UpdateAgenticFileSearchInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'agenticFileSearchInstructions',
      message.instructions == '' ||
        message.instructions == ai_file_search_task_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
