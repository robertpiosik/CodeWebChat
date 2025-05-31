import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'
import { TOOL_CONFIG_REFACTORING_STATE_KEY } from '../constants/state-keys'

const MIGRATION_ID = 'file-refactoring-to-array-migration-20250522'

type ToolConfig = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
}

/**
 * Migration to convert file refactoring tool config from ToolConfig object
 * to array with this object, following the same pattern as code completions.
 * This migration runs only once per extension installation.
 */
export async function migrate_file_refactoring_to_array(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_file_refactoring_to_array',
        message:
          'File refactoring to array migration already completed. Skipping.'
      })
      return
    }

    const existing_config = context.globalState.get<ToolConfig>(
      TOOL_CONFIG_REFACTORING_STATE_KEY
    )

    if (existing_config) {
      // Convert single config to array
      const config_array = [existing_config]

      await context.globalState.update(
        TOOL_CONFIG_REFACTORING_STATE_KEY,
        config_array
      )

      Logger.log({
        function_name: 'migrate_file_refactoring_to_array',
        message:
          'Successfully migrated file refactoring config from object to array'
      })
    } else {
      Logger.log({
        function_name: 'migrate_file_refactoring_to_array',
        message: 'No existing file refactoring config found to migrate.'
      })
    }

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_file_refactoring_to_array',
      message: 'Error migrating file refactoring config to array',
      data: error instanceof Error ? error.message : String(error)
    })
    // Do NOT mark as completed if an error occurred
  }
}
