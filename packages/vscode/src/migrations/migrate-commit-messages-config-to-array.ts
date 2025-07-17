import * as vscode from 'vscode'
import { Logger } from '../utils/logger'
import {
  TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
  DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY
} from '../constants/state-keys'

const MIGRATION_ID = 'commit-messages-config-to-array-migration-20250718'

type ToolConfig = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
}

/**
 * Migration to convert commit messages tool config from ToolConfig object
 * to array with this object.
 * This migration runs only once per extension installation.
 */
export async function migrate_commit_messages_config_to_array(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const existing_config = context.globalState.get<ToolConfig>(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY
    )

    if (existing_config && !Array.isArray(existing_config)) {
      const config_array = [existing_config]

      await context.globalState.update(
        TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
        config_array
      )
      await context.globalState.update(
        DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
        existing_config
      )

      Logger.log({
        function_name: 'migrate_commit_messages_config_to_array',
        message: 'Successfully migrated commit messages config to array'
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_commit_messages_config_to_array',
      message: 'Error migrating commit messages config',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
