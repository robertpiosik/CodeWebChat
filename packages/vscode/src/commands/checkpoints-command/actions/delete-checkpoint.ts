import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'
import { Logger } from '@shared/utils/logger'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'

export const delete_checkpoint = async (params: {
  context: vscode.ExtensionContext
  checkpoint_to_delete: Checkpoint
  panel_provider: PanelProvider
}) => {
  const checkpoints =
    params.context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const updated_checkpoints = checkpoints.filter(
    (c) => c.timestamp != params.checkpoint_to_delete.timestamp
  )
  await params.context.workspaceState.update(
    CHECKPOINTS_STATE_KEY,
    updated_checkpoints
  )
  await params.panel_provider.send_checkpoints()

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

export type ActiveDeleteOperation = {
  finalize: () => Promise<void>
  timestamp: number
}

export const delete_checkpoint_with_undo = async (params: {
  context: vscode.ExtensionContext
  checkpoint: Checkpoint
  panel_provider: PanelProvider
  get_active_operation: () => ActiveDeleteOperation | null
  set_active_operation: (op: ActiveDeleteOperation | null) => void
  on_did_update_checkpoints?: (checkpoints: Checkpoint[]) => void
  on_before_show_message?: () => void
  on_after_show_message?: () => void
}): Promise<boolean> => {
  const {
    context,
    checkpoint,
    panel_provider,
    get_active_operation,
    set_active_operation,
    on_did_update_checkpoints,
    on_before_show_message,
    on_after_show_message
  } = params

  if (get_active_operation()) {
    await get_active_operation()!.finalize()
    set_active_operation(null)
  }

  const checkpoints =
    context.workspaceState.get<Checkpoint[]>(CHECKPOINTS_STATE_KEY, []) ?? []

  // Optimistically remove from state
  const updated_checkpoints = checkpoints.filter(
    (c) => c.timestamp !== checkpoint.timestamp
  )
  await context.workspaceState.update(
    CHECKPOINTS_STATE_KEY,
    updated_checkpoints
  )
  await panel_provider.send_checkpoints()
  on_did_update_checkpoints?.(updated_checkpoints)

  const finalize = async () => {
    try {
      const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
      await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
        recursive: true
      })
    } catch (error: any) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.COULD_NOT_DELETE_CHECKPOINT_FILES(
          error.message
        )
      )
    }
  }

  const operation = { timestamp: checkpoint.timestamp, finalize }
  set_active_operation(operation)

  on_before_show_message?.()
  const choice = await vscode.window.showInformationMessage(
    dictionary.information_message.CHECKPOINT_DELETED,
    'Undo'
  )
  on_after_show_message?.()

  const current_active_op = get_active_operation()

  if (
    current_active_op &&
    current_active_op.timestamp === operation.timestamp
  ) {
    if (choice === 'Undo') {
      const current_checkpoints =
        context.workspaceState.get<Checkpoint[]>(CHECKPOINTS_STATE_KEY, []) ??
        []

      current_checkpoints.push(checkpoint)
      current_checkpoints.sort((a, b) => b.timestamp - a.timestamp)

      await context.workspaceState.update(
        CHECKPOINTS_STATE_KEY,
        current_checkpoints
      )
      await panel_provider.send_checkpoints()
      on_did_update_checkpoints?.(current_checkpoints)

      on_before_show_message?.()
      await vscode.window.showInformationMessage(
        dictionary.information_message.CHECKPOINT_RESTORED
      )
      on_after_show_message?.()

      set_active_operation(null)
      return true
    } else {
      await operation.finalize()
      set_active_operation(null)
      return false
    }
  } else if (choice === 'Undo') {
    on_before_show_message?.()
    await vscode.window.showInformationMessage(
      dictionary.information_message.COULD_NOT_UNDO_ANOTHER_CHECKPOINT_DELETED
    )
    on_after_show_message?.()
    return false
  }

  return false
}
