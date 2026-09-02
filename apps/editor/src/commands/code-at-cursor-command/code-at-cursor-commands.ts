import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { create_safe_path } from '@/utils/path-sanitizer'
import { show_ghost_text } from './utils/show-ghost-text'
import { normalize_path } from '@/utils/normalize-path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { CommitMessageDetails } from '@/utils/commit-message-details'
import { perform_code_at_cursor } from './utils/perform-code-at-cursor'
import { WebSocketManager } from '@/services/websocket-manager'

export const code_at_cursor_commands = (params: {
  workspace_provider: WorkspaceProvider
  open_editors_provider: OpenEditorsProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
}) => {
  return [
    vscode.commands.registerCommand(
      'codeWebChat.internal.applyCodeAtCursor',
      async (args: {
        file_path: string
        workspace_name?: string
        line: number
        character: number
        content: string
      }) => {
        const workspace_map = new Map<string, string>()
        vscode.workspace.workspaceFolders?.forEach((folder) => {
          workspace_map.set(folder.name, folder.uri.fsPath)
        })
        const default_workspace =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        if (!default_workspace) {
          vscode.window.showErrorMessage('No workspace folder open')
          return
        }

        let workspace_root = default_workspace
        if (args.workspace_name && workspace_map.has(args.workspace_name)) {
          workspace_root = workspace_map.get(args.workspace_name)!
        }

        const safe_path = create_safe_path(workspace_root, args.file_path)
        if (!safe_path || !fs.existsSync(safe_path)) {
          vscode.window.showErrorMessage(`File not found: ${args.file_path}`)
          return
        }

        const document = await vscode.workspace.openTextDocument(safe_path)
        const editor = await vscode.window.showTextDocument(document)

        const line_index = args.line - 1
        const char_index = args.character - 1

        if (
          line_index < 0 ||
          char_index < 0 ||
          line_index >= document.lineCount ||
          char_index > document.lineAt(line_index).text.length
        ) {
          vscode.window.showErrorMessage(
            `Invalid position in file: ${args.file_path}`
          )
          return
        }

        const position = new vscode.Position(line_index, char_index)

        if (
          editor.selection.active.line !== position.line ||
          editor.selection.active.character !== position.character
        ) {
          editor.selection = new vscode.Selection(position, position)
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport
          )
        }

        const decoded_completion = args.content

        const selected_files: string[] = []
        const checked_files = params.workspace_provider.get_checked_files()
        for (const file of checked_files) {
          const file_workspace_root =
            params.workspace_provider.get_workspace_root_for_file(file)
          if (file_workspace_root === workspace_root) {
            const relative_path = normalize_path(
              path.relative(workspace_root, file)
            )
            selected_files.push(relative_path)
          }
        }

        await show_ghost_text({
          editor,
          position,
          ghost_text: decoded_completion,
          command: {
            title: 'Code at Cursor Accepted',
            command: 'codeWebChat.internal.codeAtCursorAccepted',
            arguments: [
              {
                workspace_root,
                prompt: '',
                file_path: safe_path,
                selected_files
              }
            ]
          }
        })
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.internal.codeAtCursorAccepted',
      async (args: {
        workspace_root: string
        prompt?: string
        file_path: string
        selected_files: string[]
      }) => {
        CommitMessageDetails.add({
          extension_context: params.extension_context,
          workspace_root: args.workspace_root,
          prompt: args.prompt,
          files: [args.file_path],
          selected_files: args.selected_files
        })
      }
    ),
    vscode.commands.registerCommand('codeWebChat.codeAtCursor', async () =>
      perform_code_at_cursor({
        workspace_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        extension_context: params.extension_context,
        websocket_manager: params.websocket_manager,
        with_completion_instructions: false,
        force_quick_pick: false
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeAtCursorWithInstructions',
      async () =>
        perform_code_at_cursor({
          workspace_provider: params.workspace_provider,
          open_editors_provider: params.open_editors_provider,
          extension_context: params.extension_context,
          websocket_manager: params.websocket_manager,
          with_completion_instructions: true,
          force_quick_pick: false
        })
    ),
    vscode.commands.registerCommand('codeWebChat.codeAtCursorUsing', async () =>
      perform_code_at_cursor({
        workspace_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        extension_context: params.extension_context,
        websocket_manager: params.websocket_manager,
        with_completion_instructions: false,
        force_quick_pick: true
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeAtCursorWithInstructionsUsing',
      async () =>
        perform_code_at_cursor({
          workspace_provider: params.workspace_provider,
          open_editors_provider: params.open_editors_provider,
          extension_context: params.extension_context,
          websocket_manager: params.websocket_manager,
          with_completion_instructions: true,
          force_quick_pick: true
        })
    )
  ]
}
