import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'
import {
  TOOL_CONFIG_REFACTORING_STATE_KEY,
  TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
  DEFAULT_REFACTORING_CONFIGURATION_STATE_KEY,
  DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY
} from '../constants/state-keys'

const MIGRATION_ID = 'refactoring-to-intelligent-update-migration-202505310200'

type ToolConfig = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
}

/**
 * Migration to copy file refactoring tool configs to intelligent update configs
 * so users don't have to create them from scratch.
 * This migration runs only once per extension installation.
 */
export async function migrate_refactoring_to_intelligent_update(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_refactoring_to_intelligent_update',
        message:
          'Refactoring to intelligent update migration already completed. Skipping.'
      })
      return
    }

    const refactoring_configs = context.globalState.get<ToolConfig[]>(
      TOOL_CONFIG_REFACTORING_STATE_KEY,
      []
    )

    const existing_intelligent_update_configs = context.globalState.get<
      ToolConfig[]
    >(TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY, [])

    if (
      refactoring_configs.length > 0 &&
      existing_intelligent_update_configs.length === 0
    ) {
      const intelligent_update_configs = refactoring_configs.map((config) => ({
        ...config,
        temperature: 0
      }))

      await context.globalState.update(
        TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
        intelligent_update_configs
      )

      Logger.log({
        function_name: 'migrate_refactoring_to_intelligent_update',
        message: `Copied ${refactoring_configs.length} refactoring configs to intelligent update configs with temperature set to 0`
      })

      const default_refactoring_config = context.globalState.get<ToolConfig>(
        DEFAULT_REFACTORING_CONFIGURATION_STATE_KEY
      )

      if (default_refactoring_config) {
        await context.globalState.update(
          DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY,
          {
            ...default_refactoring_config,
            temperature: 0
          }
        )

        Logger.log({
          function_name: 'migrate_refactoring_to_intelligent_update',
          message:
            'Copied default refactoring config to default intelligent update config with temperature set to 0'
        })
      }
    } else {
      Logger.log({
        function_name: 'migrate_refactoring_to_intelligent_update',
        message:
          existing_intelligent_update_configs.length > 0
            ? 'Intelligent update configs already exist, skipping copy'
            : 'No refactoring configs found to copy'
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_refactoring_to_intelligent_update',
      message: 'Error copying refactoring configs to intelligent update',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
