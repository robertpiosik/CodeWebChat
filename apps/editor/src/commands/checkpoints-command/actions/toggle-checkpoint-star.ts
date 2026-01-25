import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const toggle_checkpoint_star = async (params: {
  context: vscode.ExtensionContext
  timestamp: number
  panel_provider: PanelProvider
}) => {
  const checkpoints =
    params.context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const checkpoint_to_update = checkpoints.find(
    (c) => c.timestamp == params.timestamp
  )
  if (checkpoint_to_update) {
    checkpoint_to_update.is_starred = !checkpoint_to_update.is_starred
    await params.context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      checkpoints
    )
    await params.panel_provider.send_checkpoints()
  }
}
