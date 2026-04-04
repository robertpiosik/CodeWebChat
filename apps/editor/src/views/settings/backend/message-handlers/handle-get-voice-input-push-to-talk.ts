import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_voice_input_push_to_talk = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('voiceInputPushToTalk', false)
  provider.postMessage({
    command: 'VOICE_INPUT_PUSH_TO_TALK',
    enabled
  })
}
