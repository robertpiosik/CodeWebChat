import * as vscode from 'vscode'
import { agentic_search_task_instructions } from '@/constants/instructions'
import { UpdateAgenticSearchInstructionsMessage } from '../../types/messages'

export const handle_update_agentic_search_instructions = async (
  message: UpdateAgenticSearchInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'agenticSearchInstructions',
      message.instructions == '' ||
        message.instructions == agentic_search_task_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
