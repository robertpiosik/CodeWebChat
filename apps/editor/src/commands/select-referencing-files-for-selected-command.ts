import * as vscode from 'vscode'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '../i18n'
import {
  get_referencing_files_for_uris,
  prompt_for_referencing_files
} from '@/features/referencing-files'

export const select_referencing_files_for_selected_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectReferencingFilesForSelected',
    async () => {
      try {
        const checked_files = workspace_provider.get_checked_files()

        if (checked_files.length === 0) {
          vscode.window.showInformationMessage(
            t('command.select-referencing-files.no-files')
          )
          return
        }

        let is_cancelled = false
        const uris = checked_files.map((file_path) =>
          vscode.Uri.file(file_path)
        )

        const matched_files = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: t('command.select-referencing-files.processing'),
            cancellable: true
          },
          async (progress, token) => {
            token.onCancellationRequested(() => {
              is_cancelled = true
            })
            return await get_referencing_files_for_uris({
              uris,
              workspace_provider,
              ignore_paths: checked_files,
              progress,
              token
            })
          }
        )

        if (is_cancelled) {
          return
        }

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(
            t('command.select-referencing-files.no-files')
          )
          return
        }

        const selected_paths = await prompt_for_referencing_files({
          matched_files,
          workspace_provider,
          extension_context
        })

        if (!selected_paths) {
          return
        }

        const selected_paths_set = new Set(selected_paths)
        const unselected_files_set = new Set(
          matched_files
            .map((m) => m.file_path)
            .filter((file_path) => !selected_paths_set.has(file_path))
        )

        const latest_checked = workspace_provider.get_checked_files()
        const latest_checked_filtered = latest_checked.filter(
          (file) => !unselected_files_set.has(file)
        )

        const paths_to_apply = [
          ...new Set([...latest_checked_filtered, ...selected_paths])
        ]

        Logger.info({
          message: `Selected ${selected_paths.length} files from reference search.`,
          data: { paths: selected_paths }
        })

        await workspace_provider.set_checked_files(paths_to_apply)
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.select-referencing-files.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'select_referencing_files_for_selected_command',
          message: 'Error searching references',
          data: error
        })
      }
    }
  )
}
