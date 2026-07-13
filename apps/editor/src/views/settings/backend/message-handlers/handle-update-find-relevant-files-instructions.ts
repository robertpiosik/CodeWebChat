import * as vscode from 'vscode'
import { find_relevant_files_instructions } from '@/constants/instructions'
import { UpdateFindRelevantFilesInstructionsMessage } from '../../types/messages'

export const handle_update_find_relevant_files_instructions = async (
  message: UpdateFindRelevantFilesInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'findRelevantFilesInstructions',
      message.instructions == '' ||
        message.instructions == find_relevant_files_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
