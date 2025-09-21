import * as vscode from 'vscode'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
  LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY
} from '../constants/state-keys'
import { parse_response } from './apply-chat-response-command/utils/clipboard-parser/clipboard-parser'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { undo_files } from './apply-chat-response-command/utils/file-operations'
import { DICTIONARY } from '@/constants/dictionary'

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
      vscode.window.showInformationMessage(DICTIONARY.NO_RECENT_CHANGES_TO_UNDO)
      return false
    }

    try {
      const success = await undo_files({ original_states })

      if (!success) {
        return false
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

      return true
    } catch (error: any) {
      console.error('Error during undo:', error)
      vscode.window.showErrorMessage(
        DICTIONARY.error_message.FAILED_TO_UNDO_CHANGES(
          error.message || 'Unknown error'
        )
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
