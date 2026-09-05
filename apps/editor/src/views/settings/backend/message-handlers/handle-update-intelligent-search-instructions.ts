import * as vscode from 'vscode'
import { intelligent_search_task_instructions } from '@/constants/instructions'
import { UpdateIntelligentSearchInstructionsMessage } from '../../types/messages'

export const handle_update_intelligent_search_instructions = async (
  message: UpdateIntelligentSearchInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'intelligentSearchInstructions',
      message.instructions == '' ||
        message.instructions == intelligent_search_task_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
