import * as vscode from 'vscode'
import { UpdateDefaultOptionForVoiceInputMessage } from '@/views/settings/types/messages'

export const handle_update_default_option_for_voice_input = async (
  message: UpdateDefaultOptionForVoiceInputMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'defaultOptionForVoiceInput',
      message.value,
      vscode.ConfigurationTarget.Global
    )
}
