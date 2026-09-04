import * as vscode from 'vscode'
import { ai_file_search_task_instructions } from '@/constants/instructions'
import { UpdateIntelligentFileSearchInstructionsMessage } from '../../types/messages'

export const handle_update_intelligent_file_search_instructions = async (
  message: UpdateIntelligentFileSearchInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'intelligentFileSearchInstructions',
      message.instructions == '' ||
        message.instructions == ai_file_search_task_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
