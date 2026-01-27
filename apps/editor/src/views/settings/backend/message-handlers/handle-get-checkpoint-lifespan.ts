import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { CHECKPOINT_DEFAULT_LIFESPAN } from '@/constants/values'

export const handle_get_checkpoint_lifespan = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const hours =
    config.get<number>('checkpointLifespan') || CHECKPOINT_DEFAULT_LIFESPAN
  provider.postMessage({ command: 'CHECKPOINT_LIFESPAN', hours })
}
