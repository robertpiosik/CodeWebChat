import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'

export const edit_checkpoint = async (params: {
  context: vscode.ExtensionContext
  checkpoint_to_edit: Checkpoint
}) => {
  const new_description = await vscode.window.showInputBox({
    prompt: 'Enter a description for the checkpoint',
    value: params.checkpoint_to_edit.description || '',
    placeHolder: 'e.g. Before refactoring the main component'
  })

  if (new_description === undefined) return

  const checkpoints =
    params.context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const checkpoint_to_update = checkpoints.find(
    (c) => c.timestamp == params.checkpoint_to_edit.timestamp
  )
  if (checkpoint_to_update) {
    checkpoint_to_update.description = new_description
    await params.context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      checkpoints
    )
  }
}
