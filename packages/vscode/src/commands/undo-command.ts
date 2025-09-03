import * as vscode from 'vscode'
import * as fs from 'fs'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
  LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY
} from '../constants/state-keys'
import { create_safe_path } from '../utils/path-sanitizer'
import { parse_response } from './apply-chat-response-command/utils/clipboard-parser/clipboard-parser'

interface OriginalFileState {
  file_path: string
  content: string
  is_new: boolean
  workspace_name?: string
}

export function undo_command(
  context: vscode.ExtensionContext,
  on_can_undo: (can_undo: boolean) => void,
  set_apply_button_state: (can_apply: boolean) => void
) {
  return vscode.commands.registerCommand('codeWebChat.undo', async () => {
    const original_states = context.workspaceState.get<OriginalFileState[]>(
      LAST_APPLIED_CHANGES_STATE_KEY
    )
    const editor_state = context.workspaceState.get<
      | {
          file_path: string
          position: { line: number; character: number }
        }
      | undefined
    >(LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY)

    if (!original_states || original_states.length == 0) {
      vscode.window.showInformationMessage(
        'No recent changes found to undo or changes were already undone.'
      )
      return false
    }

    try {
      if (vscode.workspace.workspaceFolders?.length == 0) {
        vscode.window.showErrorMessage('No workspace folder open.')
        return false
      }

      const workspace_map = new Map<string, string>()
      vscode.workspace.workspaceFolders!.forEach((folder) => {
        workspace_map.set(folder.name, folder.uri.fsPath)
      })

      const default_workspace = vscode.workspace.workspaceFolders![0].uri.fsPath

      for (const state of original_states) {
        let workspace_root = default_workspace
        if (state.workspace_name) {
          workspace_root =
            workspace_map.get(state.workspace_name) || default_workspace
        }

        const safe_path = create_safe_path(workspace_root, state.file_path)

        if (!safe_path) {
          console.error(`Cannot undo file with unsafe path: ${state.file_path}`)
          continue
        }

        if (state.is_new) {
          if (fs.existsSync(safe_path)) {
            // Close any editors with the file open
            const uri = vscode.Uri.file(safe_path)
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

            fs.unlinkSync(safe_path)
          }
        } else {
          const file_uri = vscode.Uri.file(safe_path)

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
            console.error(`Error undoing file ${state.file_path}:`, err)
            vscode.window.showWarningMessage(
              `Could not undo file: ${state.file_path}. It might have been closed or deleted.`
            )
          }
        }
      }

      if (editor_state) {
        try {
          const uri = vscode.Uri.file(editor_state.file_path)
          const document = await vscode.workspace.openTextDocument(uri)
          const editor = await vscode.window.showTextDocument(document, {
            preview: false
          })
          const position = new vscode.Position(
            editor_state.position.line,
            editor_state.position.character
          )
          editor.selection = new vscode.Selection(position, position)
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          )
        } catch (error) {
          console.error('Error restoring editor state:', error)
        }
      }

      context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
      context.workspaceState.update(
        LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
        null
      )
      context.workspaceState.update(
        LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
        null
      )
      on_can_undo(false)

      const clipboard_text = await vscode.env.clipboard.readText()
      if (!clipboard_text.trim()) {
        set_apply_button_state(false)
      } else {
        const content = parse_response(clipboard_text)
        const can_apply =
          content.code_completion != null ||
          (content.patches && content.patches.length > 0) ||
          (content.files && content.files.length > 0) ||
          false
        set_apply_button_state(can_apply)
      }

      vscode.window.showInformationMessage('Changes successfully undone.')
      return true
    } catch (error: any) {
      console.error('Error during undo:', error)
      vscode.window.showErrorMessage(
        `Failed to undo changes: ${error.message || 'Unknown error'}`
      )
      return false
    }
  })
}

export function can_undo(context: vscode.ExtensionContext): boolean {
  const original_states = context.workspaceState.get<OriginalFileState[]>(
    LAST_APPLIED_CHANGES_STATE_KEY
  )

  return !!original_states && original_states.length > 0
}
