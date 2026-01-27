import * as vscode from 'vscode'
import { UpdateCheckpointLifespanMessage } from '@/views/settings/types/messages'

export const handle_update_checkpoint_lifespan = async (
  message: UpdateCheckpointLifespanMessage
) => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'checkpointLifespan',
      message.hours ?? undefined,
      vscode.ConfigurationTarget.Global
    )
}
