import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID =
  'edit-context-to-edit-files-system-instructions-migration-20260701'

export async function migrate_edit_context_to_edit_files_system_instructions(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const inspect = config.inspect<string>('editContextSystemInstructions')

    if (inspect?.globalValue !== undefined) {
      await config.update(
        'editFilesSystemInstructions',
        inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        'editContextSystemInstructions',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_edit_context_to_edit_files_system_instructions',
      message:
        'Successfully migrated editContextSystemInstructions to editFilesSystemInstructions'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_edit_context_to_edit_files_system_instructions',
      message:
        'Error migrating editContextSystemInstructions to editFilesSystemInstructions',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
