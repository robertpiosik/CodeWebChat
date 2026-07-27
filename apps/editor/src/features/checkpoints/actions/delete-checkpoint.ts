import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '../types'
import { get_checkpoint_path } from '../utils'
import { Logger } from '@shared/utils/logger'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { t } from '@/i18n'

export const delete_checkpoint = async (params: {
  extension_context: vscode.ExtensionContext
  checkpoint_to_delete: Checkpoint
  panel_view_provider: PanelViewProvider
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

export type ActiveDeleteOperation = {
  finalize: () => Promise<void>
  timestamp: number
}

export const delete_checkpoint_with_undo = async (params: {
  extension_context: vscode.ExtensionContext
  checkpoint: Checkpoint
  panel_view_provider: PanelViewProvider
  get_active_operation: () => ActiveDeleteOperation | null
  set_active_operation: (op: ActiveDeleteOperation | null) => void
  on_did_update_checkpoints?: (checkpoints: Checkpoint[]) => void
  on_before_show_message?: () => void
  on_after_show_message?: () => void
}): Promise<boolean> => {
  if (params.get_active_operation()) {
    await params.get_active_operation()!.finalize()
    params.set_active_operation(null)
  }

  const checkpoints =
    params.extension_context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []

  const updated_checkpoints = checkpoints.filter(
    (c) => c.timestamp !== params.checkpoint.timestamp
  )
  await params.extension_context.workspaceState.update(
    CHECKPOINTS_STATE_KEY,
    updated_checkpoints
  )
  params.on_did_update_checkpoints?.(updated_checkpoints)

  const finalize = async () => {
    try {
      const checkpoint_path = get_checkpoint_path(params.checkpoint.timestamp)
      await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
        recursive: true
      })
    } catch (error: any) {
      vscode.window.showWarningMessage(
        t('feature.checkpoints.warning.could-not-delete', {
          error: error.message
        })
      )
    }
  }

  const operation = { timestamp: params.checkpoint.timestamp, finalize }
  params.set_active_operation(operation)

  params.on_before_show_message?.()
  const undo_action = t('feature.checkpoints.action.undo')
  const choice = await vscode.window.showInformationMessage(
    t('feature.checkpoints.success.deleted'),
    undo_action
  )
  params.on_after_show_message?.()

  const current_active_op = params.get_active_operation()

  if (
    current_active_op &&
    current_active_op.timestamp === operation.timestamp
  ) {
    if (choice == undo_action) {
      const current_checkpoints =
        params.extension_context.workspaceState.get<Checkpoint[]>(
          CHECKPOINTS_STATE_KEY,
          []
        ) ?? []

      current_checkpoints.push(params.checkpoint)
      current_checkpoints.sort((a, b) => b.timestamp - a.timestamp)

      await params.extension_context.workspaceState.update(
        CHECKPOINTS_STATE_KEY,
        current_checkpoints
      )
      params.on_did_update_checkpoints?.(current_checkpoints)

      params.on_before_show_message?.()
      await vscode.window.showInformationMessage(
        t('feature.checkpoints.success.restored')
      )
      params.on_after_show_message?.()

      params.set_active_operation(null)
      return true
    } else {
      await operation.finalize()
      params.set_active_operation(null)
      return false
    }
  } else if (choice == undo_action) {
    params.on_before_show_message?.()
    await vscode.window.showInformationMessage(
      t('feature.checkpoints.error.could-not-undo')
    )
    params.on_after_show_message?.()
    return false
  }

  return false
}
