import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_checkpoint_lifespan = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const hours = config.get<number>('checkpointLifespan', 48)
  provider.postMessage({ command: 'CHECKPOINT_LIFESPAN', hours })
}
