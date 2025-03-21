import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'

export function chat_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.chatToClipboard',
    async () => {
      // Main Instruction Input
      let last_chat_prompt =
        context.workspaceState.get<string>('lastChatPrompt') || ''

      const instruction = await vscode.window.showInputBox({
        prompt: 'Ask anything',
        placeHolder: 'e.g., "Our task is to..."',
        value: last_chat_prompt
      })

      if (!instruction) {
        return // User cancelled
      }

      await context.workspaceState.update('lastChatPrompt', instruction)

      // Files Collection using FilesCollector
      const files_collector = new FilesCollector(
        file_tree_provider,
        open_editors_provider
      )
      let context_text = ''

      try {
        const active_editor = vscode.window.activeTextEditor
        const active_path = active_editor?.document.uri.fsPath

        context_text = await files_collector.collect_files({
          active_path
        })
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      const final_text = `${
        context_text ? `<files>\n${context_text}</files>\n` : ''
      }${instruction}`

      // Add to chat history
      const current_history = context.workspaceState.get<string[]>(
        'chat-history',
        []
      )
      const updated_history = [instruction, ...current_history].slice(0, 100)
      await context.workspaceState.update('chat-history', updated_history)

      await vscode.env.clipboard.writeText(final_text)
      vscode.window.showInformationMessage('Chat prompt copied to clipboard')
    }
  )
}
