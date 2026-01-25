import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_gemini_user_id = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const geminiUserId = config.get<number | null>('geminiUserId') ?? null
  provider.postMessage({
    command: 'GEMINI_USER_ID',
    geminiUserId
  })
}
