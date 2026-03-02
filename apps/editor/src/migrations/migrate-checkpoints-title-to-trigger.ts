import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { CHECKPOINTS_STATE_KEY } from '../constants/state-keys'
import type { Checkpoint } from '../commands/checkpoints-command/types'

const MIGRATION_ID = 'checkpoints-title-to-trigger-migration-20260302'

export async function migrate_checkpoints_title_to_trigger(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.workspaceState.get(MIGRATION_ID)) {
      return
    }

    const checkpoints =
      context.workspaceState.get<Checkpoint[]>(CHECKPOINTS_STATE_KEY, []) ?? []

    let state_updated = false
    for (const checkpoint of checkpoints) {
      if ((checkpoint as any).title) {
        if ((checkpoint as any).title == 'Created by user')
          checkpoint.trigger = 'manual'
        else if ((checkpoint as any).title == 'Response accepted')
          checkpoint.trigger = 'response-accepted'
        else if ((checkpoint as any).title == 'Before response previewed')
          checkpoint.trigger = 'before-response-previewed'
        else if ((checkpoint as any).title == 'Before checkpoint restored')
          checkpoint.trigger = 'before-checkpoint-restored'
        else checkpoint.trigger = 'manual'

        delete (checkpoint as any).title
        state_updated = true
      }
    }

    if (state_updated) {
      await context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
      Logger.info({
        function_name: 'migrate_checkpoints_title_to_trigger',
        message: 'Successfully migrated checkpoints title to trigger'
      })
    }

    await context.workspaceState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_checkpoints_title_to_trigger',
      message: 'Error migrating checkpoints title to trigger',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
