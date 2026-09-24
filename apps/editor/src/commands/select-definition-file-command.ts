import * as vscode from 'vscode'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '../i18n'
import { get_error_message } from '@/utils/get-error-message'

export const select_definition_file_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectDefinitionFile',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }

      try {
        const document = editor.document
        const position = editor.selection.active

        const definition_uri = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: t('command.select-definition-file-command.resolving')
          },
          async () => {
            const result = await vscode.commands.executeCommand<
              vscode.Location | vscode.Location[] | vscode.LocationLink[]
            >('vscode.executeDefinitionProvider', document.uri, position)

            if (!result) return null

            if (Array.isArray(result)) {
              if (result.length == 0) return null
              const first = result[0]
              return 'targetUri' in first ? first.targetUri : first.uri
            } else {
              return (result as vscode.Location).uri
            }
          }
        )

        if (!definition_uri) {
          vscode.window.showInformationMessage(
            t('command.select-definition-file-command.no-definition')
          )
          return
        }

        const file_path = definition_uri.fsPath

        if (!workspace_provider.get_workspace_root_for_file(file_path)) {
          vscode.window.showWarningMessage(
            t('command.select-definition-file-command.outside-workspace')
          )
          return
        }

        if (workspace_provider.is_ignored_by_patterns(file_path)) {
          vscode.window.showWarningMessage(
            t('command.select-definition-file-command.ignored')
          )
          return
        }

        const current_checked = workspace_provider.get_checked_files()

        let added = false
        if (!current_checked.includes(file_path)) {
          await workspace_provider.set_checked_files([
            ...current_checked,
            file_path
          ])
          added = true
        }

        const open_button = t(
          'command.select-definition-file-command.open-file'
        )

        const message = added
          ? t('command.select-definition-file-command.added')
          : t('command.select-definition-file-command.already-in-context')

        const selection = await vscode.window.showInformationMessage(
          message,
          open_button
        )

        if (selection === open_button) {
          const doc = await vscode.workspace.openTextDocument(definition_uri)
          await vscode.window.showTextDocument(doc)
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.select-definition-file-command.failed', {
            error: get_error_message(error)
          })
        )
        Logger.error({
          function_name: 'select_definition_file_command',
          message: 'Error resolving definition',
          data: error
        })
      }
    }
  )
}
