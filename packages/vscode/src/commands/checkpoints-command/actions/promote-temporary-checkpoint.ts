import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'
import { get_incremented_description } from '../utils'

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

  checkpoints.sort((a, b) => b.timestamp - a.timestamp)

  const final_description = get_incremented_description(
    params.title,
    params.description,
    checkpoints
  )

  checkpoints.unshift({
    ...params.temp_checkpoint,
    is_temporary: false,
    title: params.title,
    description: final_description
  })
  await params.context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
}
