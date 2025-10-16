import * as vscode from 'vscode'
import dayjs from 'dayjs'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'

export const delete_checkpoint = async (params: {
  context: vscode.ExtensionContext
  checkpoint_to_delete: Checkpoint
  options?: { skip_undo_prompt?: boolean }
}) => {
  // First, remove checkpoint from state. This makes the deletion immediate from user's perspective.
  const checkpoints =
    params.context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const updated_checkpoints = checkpoints.filter(
    (c) => c.timestamp != params.checkpoint_to_delete.timestamp
  )
  await params.context.workspaceState.update(
    CHECKPOINTS_STATE_KEY,
    updated_checkpoints
  )

  const actually_delete_files = async () => {
    try {
      const checkpoint_path = get_checkpoint_path(
        params.checkpoint_to_delete.timestamp
      )
      await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
        recursive: true
      })
    } catch (error) {
      console.warn(`Could not delete checkpoint file: ${error}`)
    }
  }

  if (!params.options?.skip_undo_prompt) {
    vscode.window
      .showInformationMessage(
        `Checkpoint from ${dayjs(
          params.checkpoint_to_delete.timestamp
        ).fromNow()} deleted successfully.`,
        'Revert'
      )
      .then(async (action) => {
        if (action == 'Revert') {
          // User chose to revert. Add the checkpoint back to the state.
          const current_checkpoints =
            params.context.workspaceState.get<Checkpoint[]>(
              CHECKPOINTS_STATE_KEY,
              []
            ) ?? []
          current_checkpoints.push(params.checkpoint_to_delete)
          await params.context.workspaceState.update(
            CHECKPOINTS_STATE_KEY,
            current_checkpoints
          )
          vscode.window.showInformationMessage('Checkpoint deletion reverted.')
        } else {
          // User dismissed the notification or it timed out.
          // Proceed with deleting the checkpoint files.
          await actually_delete_files()
        }
      })
  } else {
    // This is a silent deletion (e.g. temporary checkpoint cleanup), no need
    // to ask for revert.
    await actually_delete_files()
  }
}
