import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'chat-code-completion-instructions-migration-20240625'
const OLD_SETTING_KEY = 'codeWebChat.chatCodeCompletionInstructions'
const NEW_SETTING_KEY = 'codeWebChat.chatCodeCompletionsInstructions'

/**
 * Migration to rename chatCodeCompletionInstructions setting to chatCodeCompletionsInstructions
 * This migration runs only once per extension installation.
 */
export async function migrate_chat_code_completion_instructions(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.info({
        function_name: 'migrate_chat_code_completion_instructions',
        message:
          'Chat code completion instructions migration already completed. Skipping.'
      })
      return
    }

    const config = vscode.workspace.getConfiguration()
    const existing_value = config.get<string>(OLD_SETTING_KEY)

    if (existing_value !== undefined) {
      // Set the new setting with the existing value
      await config.update(
        NEW_SETTING_KEY,
        existing_value,
        vscode.ConfigurationTarget.Global
      )

      Logger.info({
        function_name: 'migrate_chat_code_completion_instructions',
        message:
          'Successfully migrated chatCodeCompletionInstructions to chatCodeCompletionsInstructions'
      })
    } else {
      Logger.info({
        function_name: 'migrate_chat_code_completion_instructions',
        message:
          'No existing chatCodeCompletionInstructions setting found to migrate.'
      })
    }

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_chat_code_completion_instructions',
      message:
        'Error migrating chatCodeCompletionInstructions to chatCodeCompletionsInstructions',
      data: error instanceof Error ? error.message : String(error)
    })
    // Do NOT mark as completed if an error occurred
  }
}
