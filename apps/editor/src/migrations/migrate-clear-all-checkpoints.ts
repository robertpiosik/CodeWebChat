import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_STATE_KEY
} from '@/constants/state-keys'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { get_checkpoints } from '@/features/checkpoints/actions'
import { Logger } from '@shared/utils/logger'
import type { Checkpoint } from '@/features/checkpoints/types'

const MIGRATION_ID = 'clear-all-checkpoints-migration-20260910'

export async function migrate_clear_all_checkpoints(
  extension_context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (extension_context.globalState.get(MIGRATION_ID)) {
      return
    }

    const checkpoints = await get_checkpoints(extension_context)

    for (const checkpoint of checkpoints) {
      try {
        const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
        await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
          recursive: true
        })
      } catch (error) {
        Logger.warn({
          function_name: 'migrate_clear_all_checkpoints',
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
          function_name: 'migrate_clear_all_checkpoints',
          message: 'Could not delete temporary checkpoint file',
          data: error
        })
      }
    }

    await extension_context.workspaceState.update(
      TEMPORARY_CHECKPOINT_STATE_KEY,
      undefined
    )
    await extension_context.workspaceState.update(CHECKPOINTS_STATE_KEY, [])

    await extension_context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_clear_all_checkpoints',
      message: 'Successfully migrated and cleared all checkpoints'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_clear_all_checkpoints',
      message: 'Error migrating and clearing all checkpoints',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
