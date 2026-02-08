import * as vscode from 'vscode'
import { UpdateVoiceInputInstructionsMessage } from '@/views/settings/types/messages'
import { voice_input_instructions } from '@/constants/instructions'

export const handle_update_voice_input_instructions = async (
  message: UpdateVoiceInputInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'voiceInputInstructions',
      message.instructions == '' ||
        message.instructions == voice_input_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
