import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '../types'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const update_checkpoint_description = async (params: {
  extension_context: vscode.ExtensionContext
  timestamp: number
  description: string
  panel_view_provider: PanelViewProvider
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
    checkpoint_to_update.description = params.description
    await params.extension_context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      checkpoints
    )
  }
}
