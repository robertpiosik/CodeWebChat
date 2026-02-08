import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { voice_input_instructions } from '@/constants/instructions'

export const handle_get_voice_input_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions =
    config.get<string>('voiceInputInstructions') || voice_input_instructions
  provider.postMessage({
    command: 'VOICE_INPUT_INSTRUCTIONS',
    instructions
  })
}
