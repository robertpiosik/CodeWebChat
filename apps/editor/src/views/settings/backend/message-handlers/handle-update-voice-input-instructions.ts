import * as vscode from 'vscode'
import { UpdateVoiceInputInstructionsMessage } from '../../types/messages'

export const handle_update_voice_input_instructions = async (
  message: UpdateVoiceInputInstructionsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions =
    config.inspect<string>('voiceInputInstructions')?.defaultValue || ''
  await config.update(
    'voiceInputInstructions',
    message.instructions == '' || message.instructions == default_instructions
      ? undefined
      : message.instructions,
    vscode.ConfigurationTarget.Global
  )
}
