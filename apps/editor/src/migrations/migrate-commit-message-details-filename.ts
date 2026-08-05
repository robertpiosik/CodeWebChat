import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'commit-message-details-filename-migration-20260805'

export async function migrate_commit_message_details_filename(
  extension_context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (extension_context.globalState.get(MIGRATION_ID)) {
      return
    }

    const old_path = path.join(
      extension_context.globalStorageUri.fsPath,
      'prompts-for-commit.json'
    )

    const new_path = path.join(
      extension_context.globalStorageUri.fsPath,
      'commit-message-details.json'
    )

    if (fs.existsSync(old_path) && !fs.existsSync(new_path)) {
      fs.renameSync(old_path, new_path)
    }

    await extension_context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_commit_message_details_filename',
      message: 'Successfully migrated commit message details filename'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_commit_message_details_filename',
      message: 'Error migrating commit message details filename',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
