import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_STATE_KEY
} from '@/constants/state-keys'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { get_checkpoints } from '@/features/checkpoints/actions'
import { Logger } from '@shared/utils/logger'
import type { Checkpoint } from '@/features/checkpoints/types'
import { t } from '@/i18n'

export const clear_all_checkpoints = async (
  extension_context: vscode.ExtensionContext
) => {
  const clear_task = async () => {
    const checkpoints = await get_checkpoints(extension_context)
    const checkpoints_to_keep: Checkpoint[] = []

    for (const checkpoint of checkpoints) {
      if (checkpoint.is_pinned) {
        checkpoints_to_keep.push(checkpoint)
        continue
      }
      try {
        const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
        await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
          recursive: true
        })
      } catch (error) {
        Logger.warn({
          function_name: 'clear_all_checkpoints',
          message: 'Could not delete checkpoint file',
          data: error
        })
      }
    }
    const temp_checkpoint = extension_context.workspaceState.get<Checkpoint>(
      TEMPORARY_CHECKPOINT_STATE_KEY
    )
    if (temp_checkpoint) {
      try {
        const checkpoint_path = get_checkpoint_path(temp_checkpoint.timestamp)
        await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
          recursive: true
        })
      } catch (error) {
        Logger.warn({
          function_name: 'clear_all_checkpoints',
          message: 'Could not delete temporary checkpoint file',
          data: error
        })
      }
    }
    await extension_context.workspaceState.update(
      TEMPORARY_CHECKPOINT_STATE_KEY,
      undefined
    )
    await extension_context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      checkpoints_to_keep
    )
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('command.history.progress.clearing-all'),
      cancellable: false
    },
    clear_task
  )
}
