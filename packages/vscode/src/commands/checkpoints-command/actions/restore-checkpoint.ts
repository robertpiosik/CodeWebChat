import * as vscode from 'vscode'
import { TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY } from '../../../constants/state-keys'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint } from '../types'
import { create_temporary_checkpoint } from './create-temporary-checkpoint'
import { delete_checkpoint } from './delete-checkpoint'
import { sync_workspace_from_dir } from './sync-workspace-from-dir'
import { get_checkpoint_path } from '../utils'

export const restore_checkpoint = async (params: {
  checkpoint: Checkpoint
  workspace_provider: WorkspaceProvider
  context: vscode.ExtensionContext
  options?: { skip_confirmation?: boolean }
}) => {
  let temp_checkpoint: Checkpoint | undefined
  try {
    if (!params.options?.skip_confirmation) {
      const old_temp_timestamp = params.context.workspaceState.get<number>(
        TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY
      )
      if (old_temp_timestamp) {
        try {
          const checkpoint_path = get_checkpoint_path(old_temp_timestamp)
          await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
            recursive: true
          })
        } catch (error) {
          console.warn(
            `Could not delete old temporary checkpoint file: ${error}`
          )
        }
      }

      temp_checkpoint = await create_temporary_checkpoint(
        params.workspace_provider
      )
      await params.context.workspaceState.update(
        TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
        temp_checkpoint.timestamp
      )
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create temporary checkpoint for revert: ${err.message}`
    )
    await params.context.workspaceState.update(
      TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
      undefined
    )
    return // Don't proceed
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: params.options?.skip_confirmation
          ? 'Reverting...'
          : 'Restoring checkpoint...',
        cancellable: false
      },
      async () => {
        const checkpoint_dir_path = get_checkpoint_path(
          params.checkpoint.timestamp
        )
        const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
        await sync_workspace_from_dir({
          source_dir_uri: checkpoint_dir_uri,
          workspace_provider: params.workspace_provider
        })
      }
    )

    const message = params.options?.skip_confirmation
      ? 'Successfully reverted changes.'
      : `Checkpoint restored successfully.`

    if (temp_checkpoint) {
      const action = await vscode.window.showInformationMessage(
        message,
        'Revert'
      )
      if (action == 'Revert') {
        await restore_checkpoint({
          checkpoint: temp_checkpoint,
          workspace_provider: params.workspace_provider,
          context: params.context,
          options: { skip_confirmation: true }
        })
        await delete_checkpoint({
          context: params.context,
          checkpoint_to_delete: temp_checkpoint,
          options: { skip_undo_prompt: true }
        })
        await params.context.workspaceState.update(
          TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
          undefined
        )
      }
    } else {
      vscode.window.showInformationMessage(message)
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to restore checkpoint: ${err.message}`
    )
    if (temp_checkpoint) {
      await delete_checkpoint({
        context: params.context,
        checkpoint_to_delete: temp_checkpoint,
        options: { skip_undo_prompt: true }
      })
      await params.context.workspaceState.update(
        TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
        undefined
      )
    }
  }
}
