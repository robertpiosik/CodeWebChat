import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'

export const promote_temporary_checkpoint = async (params: {
  context: vscode.ExtensionContext
  temp_checkpoint: Checkpoint
  title: string
  description?: string
}) => {
  const checkpoints =
    params.context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  checkpoints.push({
    ...params.temp_checkpoint,
    is_temporary: false,
    title: params.title,
    description: params.description
  })
  await params.context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
}
