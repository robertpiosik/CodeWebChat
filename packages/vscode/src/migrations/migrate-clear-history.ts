import * as vscode from 'vscode'
import { Logger } from '../utils/logger'
import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY,
  PINNED_HISTORY_ASK_STATE_KEY,
  PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY,
  PINNED_HISTORY_EDIT_STATE_KEY,
  PINNED_HISTORY_NO_CONTEXT_STATE_KEY
} from '../constants/state-keys'

const MIGRATION_ID = 'clear-history-for-object-migration-20250725'

/**
 * Migration to clear all history due to a data structure change from string[] to HistoryEntry[].
 * This migration runs only once per workspace.
 */
export async function migrate_clear_history(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.workspaceState.get(MIGRATION_ID)) {
      return
    }

    const history_keys = [
      HISTORY_ASK_STATE_KEY,
      HISTORY_EDIT_STATE_KEY,
      HISTORY_CODE_COMPLETIONS_STATE_KEY,
      HISTORY_NO_CONTEXT_STATE_KEY,
      PINNED_HISTORY_ASK_STATE_KEY,
      PINNED_HISTORY_EDIT_STATE_KEY,
      PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY,
      PINNED_HISTORY_NO_CONTEXT_STATE_KEY
    ]

    for (const key of history_keys) {
      await context.workspaceState.update(key, undefined)
    }

    Logger.log({
      function_name: 'migrate_clear_history',
      message: 'Successfully cleared old string-based history.'
    })

    await context.workspaceState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_clear_history',
      message: 'Error clearing history',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
