import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint } from '../types'
import { copy_workspace_to_dir } from './copy-workspace-to-dir'
import { get_checkpoints } from './get-checkpoints'
import { get_checkpoint_path } from '../utils'

export const create_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext
): Promise<boolean> => {
  try {
    const timestamp = Date.now()
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Creating checkpoint...',
        cancellable: false
      },
      async () => {
        await vscode.workspace.saveAll()
        const checkpoint_dir_path = get_checkpoint_path(timestamp)
        const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
        await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

        await copy_workspace_to_dir(checkpoint_dir_uri, workspace_provider)

        const new_checkpoint: Checkpoint = {
          title: 'Created by user',
          timestamp
        }

        const checkpoints = await get_checkpoints(context)
        checkpoints.push(new_checkpoint)
        await context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
      }
    )
    return true
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create checkpoint: ${err.message}`
    )
    return false
  }
}
