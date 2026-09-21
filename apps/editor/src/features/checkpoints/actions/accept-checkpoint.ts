import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'
import { ResponseHistoryItem } from '@shared/types/response-history-item'

export const accept_checkpoint = async (params: {
  extension_context: vscode.ExtensionContext
  checkpoint: Checkpoint
  history_for_checkpoint: ResponseHistoryItem[]
  created_at_for_preview?: number
}) => {
  const checkpoints =
    params.extension_context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const checkpoint_index = checkpoints.findIndex(
    (c) => c.timestamp == params.checkpoint.timestamp
  )
  if (checkpoint_index != -1) {
    const checkpoint_to_update = checkpoints[checkpoint_index]
    const old_timestamp = checkpoint_to_update.timestamp
    const new_timestamp = Date.now()
    const old_path = get_checkpoint_path(old_timestamp)
    const new_path = get_checkpoint_path(new_timestamp)
    try {
      await vscode.workspace.fs.rename(
        vscode.Uri.file(old_path),
        vscode.Uri.file(new_path)
      )
      checkpoint_to_update.timestamp = new_timestamp
    } catch (err) {
      console.error(
        `Failed to rename checkpoint directory for timestamp update:`,
        err
      )
    }
    checkpoint_to_update.trigger = 'response-accepted'
    checkpoint_to_update.response_history = params.history_for_checkpoint
    checkpoint_to_update.response_preview_item_created_at =
      params.created_at_for_preview

    checkpoints.sort((a, b) => b.timestamp - a.timestamp)

    await params.extension_context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      checkpoints
    )
  }
}
