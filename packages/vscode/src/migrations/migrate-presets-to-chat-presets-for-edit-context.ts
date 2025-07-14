import * as vscode from 'vscode'
import { Logger } from '../utils/logger'

const MIGRATION_ID =
  'presets-to-chat-presets-for-edit-context-migration-20250714'
const OLD_SETTING_KEY = 'codeWebChat.presets'
const NEW_SETTING_KEY = 'codeWebChat.chatPresetsForEditContext'

/**
 * Migration to rename presets to chatPresetsForEditContext.
 * This migration runs only once per extension installation.
 */
export async function migrate_presets_to_chat_presets_for_edit_context(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration()
    const inspect = config.inspect(OLD_SETTING_KEY)

    if (inspect?.globalValue !== undefined) {
      await config.update(
        NEW_SETTING_KEY,
        inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        OLD_SETTING_KEY,
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    if (inspect?.workspaceValue !== undefined) {
      await config.update(
        NEW_SETTING_KEY,
        inspect.workspaceValue,
        vscode.ConfigurationTarget.Workspace
      )
      await config.update(
        OLD_SETTING_KEY,
        undefined,
        vscode.ConfigurationTarget.Workspace
      )
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.log({
      function_name: 'migrate_presets_to_chat_presets_for_edit_context',
      message: 'Migration for presets to chatPresetsForEditContext completed.'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_presets_to_chat_presets_for_edit_context',
      message: 'Error migrating presets to chatPresetsForEditContext',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
