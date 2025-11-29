import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'

import { Logger } from '@shared/utils/logger'

export const remove_old_checkpoints = async (
  checkpoints: Checkpoint[]
): Promise<Checkpoint[]> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const checkpoint_lifespan_hours =
    config.get<number>('checkpointLifespan') || 48
  const checkpoint_lifespan_ms = checkpoint_lifespan_hours * 60 * 60 * 1000

  const now = Date.now()
  const cutoff_time = now - checkpoint_lifespan_ms

  const checkpoints_to_keep: Checkpoint[] = []
  const checkpoints_to_remove: Checkpoint[] = []

  for (const checkpoint of checkpoints) {
    if (checkpoint.timestamp < cutoff_time && !checkpoint.is_starred) {
      checkpoints_to_remove.push(checkpoint)
    } else {
      checkpoints_to_keep.push(checkpoint)
    }
  }

  // Delete old checkpoint files
  for (const checkpoint of checkpoints_to_remove) {
    try {
      const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
      await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
        recursive: true
      })
      Logger.info({
        function_name: 'remove_old_checkpoints',
        message: `Removed old checkpoint: ${checkpoint.title}`,
        data: { timestamp: checkpoint.timestamp }
      })
    } catch (error) {
      Logger.warn({
        function_name: 'remove_old_checkpoints',
        message: 'Could not delete old checkpoint file',
        data: error
      })
    }
  }

  return checkpoints_to_keep
}
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

  return valid_checkpoints
}
