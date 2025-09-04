import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'commit-message-prompt-to-instructions-migration-20250522'
const OLD_SETTING_KEY = 'codeWebChat.commitMessagePrompt'
const NEW_SETTING_KEY = 'codeWebChat.commitMessageInstructions'

/**
 * Migration to rename commitMessagePrompt setting to commitMessageInstructions
 * This migration runs only once per extension installation.
 */
export async function migrate_commit_message_prompt_to_instructions(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Check if migration has already run
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.log({
        function_name: 'migrate_commit_message_prompt_to_instructions',
        message:
          'Commit message prompt to instructions migration already completed. Skipping.'
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

      Logger.log({
        function_name: 'migrate_commit_message_prompt_to_instructions',
        message:
          'Successfully migrated commitMessagePrompt to commitMessageInstructions'
      })
    } else {
      Logger.log({
        function_name: 'migrate_commit_message_prompt_to_instructions',
        message: 'No existing commitMessagePrompt setting found to migrate.'
      })
    }

    // Mark migration as completed
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_commit_message_prompt_to_instructions',
      message:
        'Error migrating commitMessagePrompt to commitMessageInstructions',
      data: error instanceof Error ? error.message : String(error)
    })
    // Do NOT mark as completed if an error occurred
  }
}
