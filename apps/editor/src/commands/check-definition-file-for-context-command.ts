import * as vscode from 'vscode'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'

export const check_definition_file_for_context_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkDefinitionFileForContext',
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
            title: 'Resolving definition...'
          },
          async () => {
            const result = await vscode.commands.executeCommand<
              vscode.Location | vscode.Location[] | vscode.LocationLink[]
            >('vscode.executeDefinitionProvider', document.uri, position)

            if (!result) return null

            if (Array.isArray(result)) {
              if (result.length === 0) return null
              const first = result[0]
              return 'targetUri' in first ? first.targetUri : first.uri
            } else {
              return (result as vscode.Location).uri
            }
          }
        )

        if (!definition_uri) {
          vscode.window.showInformationMessage('No definition found.')
          return
        }

        const file_path = definition_uri.fsPath

        if (!workspace_provider.get_workspace_root_for_file(file_path)) {
          vscode.window.showWarningMessage(
            'Definition found is outside the workspace.'
          )
          return
        }

        if (workspace_provider.is_ignored_by_patterns(file_path)) {
          vscode.window.showWarningMessage(
            'Definition found is in an ignored file.'
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

        const open_button = 'Open File'

        const message = added
          ? `Added definition to context.`
          : `The definition is already in context.`

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
          `Check definition failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'check_definition_file_for_context_command',
          message: 'Error resolving definition',
          data: error
        })
      }
    }
  )
}
