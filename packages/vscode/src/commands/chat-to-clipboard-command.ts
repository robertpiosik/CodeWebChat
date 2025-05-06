import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { replace_selection_placeholder } from '../utils/replace-selection-placeholder'
import { EditFormat } from '@shared/types/edit-format'

export function chat_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'geminiCoder.chatToClipboard',
    async () => {
      const last_chat_prompt =
        context.workspaceState.get<string>('last-chat-prompt') || ''

      const input_box = vscode.window.createInputBox()
      input_box.placeholder = 'Ask anything'
      input_box.value = last_chat_prompt

      input_box.onDidChangeValue(async (value) => {
        await context.workspaceState.update('last-chat-prompt', value)
      })

      let instructions = await new Promise<string | undefined>((resolve) => {
        input_box.onDidAccept(() => {
          resolve(input_box.value)
          input_box.hide()
        })
        input_box.onDidHide(() => resolve(undefined))
        input_box.show()
      })

      if (!instructions) {
        return // User cancelled
      }

      const current_history = context.workspaceState.get<string[]>(
        'history',
        []
      )
      const updated_history = [instructions, ...current_history].slice(0, 100)
      await context.workspaceState.update('history', updated_history)

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

      instructions = replace_selection_placeholder(instructions)

      const config = vscode.workspace.getConfiguration()
      const edit_format = config.get<EditFormat>('geminiCoder.editFormat')!
      const edit_format_instructions = config.get<string>(
        `geminiCoder.editFormatInstructions${
          edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
        }`
      )

      if (edit_format_instructions) {
        instructions += `\n${edit_format_instructions}`
      }

      const text = `${
        context_text
          ? `${instructions}\n<files>\n${context_text}</files>\n`
          : ''
      }${instructions}`

      await vscode.env.clipboard.writeText(text)
      vscode.window.showInformationMessage('Chat prompt copied to clipboard!')
    }
  )
}
