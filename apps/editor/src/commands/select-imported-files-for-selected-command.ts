import * as vscode from 'vscode'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { prompt_for_imported_files } from '@/features/imported-files'
import { t } from '@/i18n'

export const select_imported_files_for_selected_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectImportedFilesForSelected',
    async () => {
      const checked_files = workspace_provider.get_checked_files()

      if (checked_files.length === 0) {
        vscode.window.showInformationMessage(
          t('command.select-imported-files.no-valid-files')
        )
        return
      }

      const starting_uris = checked_files.map((file_path) =>
        vscode.Uri.file(file_path)
      )

      const result = await prompt_for_imported_files({
        starting_uris,
        workspace_provider,
        extension_context
      })

      if (result) {
        const final_checked = workspace_provider.get_checked_files()
        const paths_to_apply = [
          ...new Set([
            ...final_checked.filter((p) => !result.shown_paths.includes(p)),
            ...result.selected_paths
          ])
        ]
        await workspace_provider.set_checked_files(paths_to_apply)
      }
    }
  )
}
