import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_ai_studio_user_id = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const aiStudioUserId = config.get<number | null>('aiStudioUserId') ?? null
  provider.postMessage({
    command: 'AI_STUDIO_USER_ID',
    aiStudioUserId
  })
}
