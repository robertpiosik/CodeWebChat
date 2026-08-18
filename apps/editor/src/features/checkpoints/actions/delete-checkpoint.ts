import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'
import { Logger } from '@shared/utils/logger'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const delete_checkpoint = async (params: {
  extension_context: vscode.ExtensionContext
  checkpoint_to_delete: Checkpoint
  prompt_view_provider: PromptViewProvider
}) => {
  const checkpoints =
    params.extension_context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const updated_checkpoints = checkpoints.filter(
    (c) => c.timestamp != params.checkpoint_to_delete.timestamp
  )
  await params.extension_context.workspaceState.update(
    CHECKPOINTS_STATE_KEY,
    updated_checkpoints
  )

  try {
    const checkpoint_path = get_checkpoint_path(
      params.checkpoint_to_delete.timestamp
    )
    await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
      recursive: true
    })
  } catch (error) {
    Logger.warn({
      function_name: 'delete_checkpoint',
      message: 'Could not delete checkpoint file',
      data: error
    })
  }
}
