import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'
import { ApiProvidersManager } from '../services/api-providers-manager'

const MIGRATION_ID = 'api-tool-config-migration-1705251830'

type LegacyToolSettings = {
  provider: 'Gemini API' | 'OpenRouter'
  model?: string
  temperature?: number
}

/**
 * Migration to update api tool configuration for code completions, file refactoring,
 * and commit messages to use built-in Gemini instead of Gemini API.
 * This migration runs only once per extension installation.
 */
export async function migrate_api_tool_configs(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_api_tool_config',
        message: 'API tool config migration already completed. Skipping.'
      })
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const api_providers_manager = new ApiProvidersManager(context)

    // Get all legacy settings
    const completions_settings: LegacyToolSettings | undefined = config.get(
      'apiToolCodeCompletionsSettings'
    )
    const refactoring_settings: LegacyToolSettings | undefined = config.get(
      'apiToolFileRefactoringSettings'
    )
    const commit_settings: LegacyToolSettings | undefined = config.get(
      'apiToolCommitMessageSettings'
    )

    // Convert legacy settings to new format
    if (
      completions_settings?.provider === 'Gemini API' &&
      completions_settings.model
    ) {
      await api_providers_manager.save_code_completions_tool_config([
        {
          provider_type: 'built-in',
          provider_name: 'Gemini',
          model: completions_settings.model,
          temperature: completions_settings.temperature || 0.2
        }
      ])

      Logger.log({
        function_name: 'migrate_api_tool_config',
        message: 'Migrated code completions settings to use built-in Gemini'
      })
    }

    if (
      refactoring_settings?.provider === 'Gemini API' &&
      refactoring_settings.model
    ) {
      await api_providers_manager.save_file_refactoring_tool_config({
        provider_type: 'built-in',
        provider_name: 'Gemini',
        model: refactoring_settings.model,
        temperature: refactoring_settings.temperature || 0
      })

      Logger.log({
        function_name: 'migrate_api_tool_config',
        message: 'Migrated file refactoring settings to use built-in Gemini'
      })
    }

    if (commit_settings?.provider === 'Gemini API' && commit_settings.model) {
      await api_providers_manager.save_commit_messages_tool_config({
        provider_type: 'built-in',
        provider_name: 'Gemini',
        model: commit_settings.model,
        temperature: commit_settings.temperature || 0.3
      })

      Logger.log({
        function_name: 'migrate_api_tool_config',
        message: 'Migrated commit messages settings to use built-in Gemini'
      })
    }

    // Remove old settings
    await config.update(
      'apiToolCodeCompletionsSettings',
      undefined,
      vscode.ConfigurationTarget.Global
    )
    await config.update(
      'apiToolFileRefactoringSettings',
      undefined,
      vscode.ConfigurationTarget.Global
    )
    await config.update(
      'apiToolCommitMessageSettings',
      undefined,
      vscode.ConfigurationTarget.Global
    )

    Logger.log({
      function_name: 'migrate_api_tool_config',
      message: 'Removed legacy API tool settings'
    })

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_api_tool_config',
      message: 'Error migrating API tool config',
      data: error instanceof Error ? error.message : String(error)
    })
    // Do NOT mark as completed if an error occurred
  }
}
