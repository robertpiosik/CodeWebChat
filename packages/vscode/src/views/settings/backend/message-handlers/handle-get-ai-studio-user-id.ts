import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_ai_studio_user_id = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const aiStudioUserId = config.get<number | null>('aiStudioUserId') ?? null
  provider.postMessage({
    command: 'AI_STUDIO_USER_ID',
    aiStudioUserId
  })
}
