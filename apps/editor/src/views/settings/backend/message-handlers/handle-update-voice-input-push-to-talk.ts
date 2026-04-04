import * as vscode from 'vscode'
import { UpdateVoiceInputPushToTalkMessage } from '@/views/settings/types/messages'

export const handle_update_voice_input_push_to_talk = async (
  message: UpdateVoiceInputPushToTalkMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'voiceInputPushToTalk',
      message.enabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}
