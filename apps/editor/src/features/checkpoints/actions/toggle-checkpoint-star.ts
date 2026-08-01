import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '../types'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const toggle_checkpoint_star = async (params: {
  extension_context: vscode.ExtensionContext
  timestamp: number
  prompt_view_provider: PromptViewProvider
}) => {
  const checkpoints =
    params.extension_context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const checkpoint_to_update = checkpoints.find(
    (c) => c.timestamp == params.timestamp
  )
  if (checkpoint_to_update) {
    checkpoint_to_update.is_starred = !checkpoint_to_update.is_starred
    await params.extension_context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      checkpoints
    )
  }
}
