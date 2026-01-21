import * as vscode from 'vscode'
import { UpdatePruneContextInstructionsMessage } from '@/views/settings/types/messages'
import { prune_context_instructions } from '@/constants/instructions'

export const handle_update_prune_context_instructions = async (
  message: UpdatePruneContextInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'pruneContextInstructions',
      message.instructions == '' ||
        message.instructions == prune_context_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
