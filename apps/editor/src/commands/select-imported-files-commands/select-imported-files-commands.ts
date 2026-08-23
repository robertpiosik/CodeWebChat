import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { prompt_for_imported_files } from './utils/prompt-for-imported-files'
import { t } from '@/i18n'
import { WebSocketManager } from '@/services/websocket-manager'

export const select_imported_files_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
) => {
  return [
    vscode.commands.registerCommand(
      'codeWebChat.selectImportedFiles',
      async (item?: any) => {
        let target_uri: vscode.Uri | undefined

        if (item?.resourceUri) {
          target_uri = item.resourceUri
        } else if (
          item instanceof vscode.Uri ||
          (item && item.fsPath && item.scheme)
        ) {
          target_uri = item as vscode.Uri
        } else {
          const editor = vscode.window.activeTextEditor
          if (editor) {
            target_uri = editor.document.uri
          }
        }

        if (!target_uri) return

        const starting_uris =
          await workspace_provider.get_all_files_for_uri(target_uri)

        if (starting_uris.length == 0) {
          vscode.window.showInformationMessage(
            t('command.select-imported-files.no-valid-files')
          )
          return
        }

        const result = await prompt_for_imported_files({
          starting_uris,
          workspace_provider,
          extension_context,
          websocket_manager
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
    ),
    vscode.commands.registerCommand(
      'codeWebChat.selectImportedFilesForSelected',
      async () => {
        const checked_files = workspace_provider.get_checked_files()

        if (checked_files.length == 0) {
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
          extension_context,
          websocket_manager
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
  ]
}
