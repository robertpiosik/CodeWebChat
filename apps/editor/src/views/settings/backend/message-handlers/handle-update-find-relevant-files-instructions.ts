import * as vscode from 'vscode'
import { UpdateFindRelevantFilesInstructionsMessage } from '@/views/settings/types/messages'
import { find_relevant_files_instructions } from '@/constants/instructions'

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
