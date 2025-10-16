import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'

export const get_checkpoints = async (
  context: vscode.ExtensionContext
): Promise<Checkpoint[]> => {
  const checkpoints =
    context.workspaceState.get<Checkpoint[]>(CHECKPOINTS_STATE_KEY, []) ?? []
  const valid_checkpoints: Checkpoint[] = []
  let state_updated = false
  for (const checkpoint of checkpoints) {
    try {
      const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
      await vscode.workspace.fs.stat(vscode.Uri.file(checkpoint_path))
      if (!checkpoint.is_temporary) valid_checkpoints.push(checkpoint)
    } catch {
      state_updated = true
    }
  }

  if (state_updated) {
    await context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      valid_checkpoints
    )
  }

  return valid_checkpoints.sort((a, b) => b.timestamp - a.timestamp)
}
