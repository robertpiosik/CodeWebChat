import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../constants/state-keys'

// Interface to match the one in apply-changes-command.ts
interface OriginalFileState {
  file_path: string
  content: string
  is_new: boolean
}

/**
 * Revert files to their original state from global state
 */
async function revert_last_applied_changes(
  context: vscode.ExtensionContext
): Promise<boolean> {
  // Get the stored original states
  const original_states = context.workspaceState.get<OriginalFileState[]>(
    LAST_APPLIED_CHANGES_STATE_KEY
  )

  if (!original_states || original_states.length == 0) {
    vscode.window.showInformationMessage(
      'No recent changes found to revert or changes were already reverted.'
    )
    return false
  }

  try {
    for (const state of original_states) {
      // For new files that were created, delete them
      if (state.is_new) {
        if (vscode.workspace.workspaceFolders) {
          const file_path = path.join(
            vscode.workspace.workspaceFolders[0].uri.fsPath,
            state.file_path
          )
          if (fs.existsSync(file_path)) {
            // Close any editors with the file open
            const uri = vscode.Uri.file(file_path)
            // Try to close the editor if it's open
            const text_editors = vscode.window.visibleTextEditors.filter(
              (editor) => editor.document.uri.toString() === uri.toString()
            )
            for (const editor of text_editors) {
              await vscode.window.showTextDocument(editor.document, {
                preview: false,
                preserveFocus: false
              })
              await vscode.commands.executeCommand(
                'workbench.action.closeActiveEditor'
              )
            }

            // Delete the file
            fs.unlinkSync(file_path)
          }
        }
      } else {
        // For existing files that were modified, restore original content
        const file_uri = vscode.Uri.file(
          path.join(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            state.file_path
          )
        )

        try {
          const document = await vscode.workspace.openTextDocument(file_uri)
          const editor = await vscode.window.showTextDocument(document)
          await editor.edit((edit) => {
            edit.replace(
              new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              ),
              state.content
            )
          })
          await document.save()
        } catch (err) {
          console.error(`Error reverting file ${state.file_path}:`, err)
          // Optionally, notify the user about the specific file error
          vscode.window.showWarningMessage(
            `Could not revert file: ${state.file_path}. It might have been closed or deleted.`
          )
        }
      }
    }

    // Clear the stored state after successfully reverting
    context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)

    vscode.window.showInformationMessage('Changes successfully reverted.')
    return true
  } catch (error: any) {
    console.error('Error during reversion:', error)
    vscode.window.showErrorMessage(
      `Failed to revert changes: ${error.message || 'Unknown error'}`
    )
    return false
  }
}

export function revert_command(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand('geminiCoder.revert', async () => {
    await revert_last_applied_changes(context)
  })
}
