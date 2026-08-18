import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '@/constants/state-keys'
import type { Checkpoint } from '@/features/checkpoints/types'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { t } from '@/i18n'

export type ActiveDeleteOperation = {
  finalize: () => Promise<void>
  timestamp: number
}

export const delete_checkpoint_with_undo = async (params: {
  extension_context: vscode.ExtensionContext
  checkpoint: Checkpoint
  prompt_view_provider: PromptViewProvider
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
        t('command.history.warning.could-not-delete', {
          error: error.message
        })
      )
    }
  }

  const operation = { timestamp: params.checkpoint.timestamp, finalize }
  params.set_active_operation(operation)

  params.on_before_show_message?.()
  const undo_action = t('command.history.action.undo')
  const choice = await vscode.window.showInformationMessage(
    t('command.history.success.deleted'),
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
        t('command.history.success.restored')
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
      t('command.history.error.could-not-undo')
    )
    params.on_after_show_message?.()
    return false
  }

  return false
}
