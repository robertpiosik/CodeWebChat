import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import { get_checkpoint_path } from '../utils'
import { get_checkpoints } from './get-checkpoints'
import { Logger } from '@shared/utils/logger'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const clear_all_checkpoints = async (
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider
) => {
  const clear_task = async () => {
    const checkpoints = await get_checkpoints(context)
    for (const checkpoint of checkpoints) {
      try {
        const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
        await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
          recursive: true
        })
      } catch (error) {
        Logger.warn({
          function_name: 'clear_all_checkpoints',
          message: 'Could not delete checkpoint file',
          data: error
        })
      }
    }
    await context.workspaceState.update(CHECKPOINTS_STATE_KEY, [])
    await panel_provider.send_checkpoints()
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Clearing all checkpoints...',
      cancellable: false
    },
    clear_task
  )
}
