import * as vscode from 'vscode'
import { UpdateFindRelevantFilesInstructionsPrefixMessage } from '@/views/settings/types/messages'
import { find_relevant_files_instructions_prefix } from '@/constants/instructions'

export const handle_update_find_relevant_files_instructions_prefix = async (
  message: UpdateFindRelevantFilesInstructionsPrefixMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'findRelevantFilesInstructionsPrefix',
      message.instructions == '' ||
        message.instructions == find_relevant_files_instructions_prefix
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
