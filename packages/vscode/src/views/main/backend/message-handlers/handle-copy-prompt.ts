import { MainViewProvider } from '@/views/main/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { replace_changes_placeholder } from '@/utils/replace-changes-placeholder'

export const handle_copy_prompt = async (
  provider: MainViewProvider
): Promise<void> => {
  const files_collector = new FilesCollector(
    provider.workspace_provider,
    provider.open_editors_provider,
    provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor
  const current_instruction =
    provider.web_mode == 'code-completions'
      ? provider.code_completion_suggestions
      : provider.instructions

  if (provider.web_mode == 'code-completions' && active_editor) {
    const document = active_editor.document
    const position = active_editor.selection.active
    const active_path = document.uri.fsPath

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const context_text = await files_collector.collect_files({
      exclude_path: active_path
    })

    const workspace_folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    const relative_path = active_path.replace(workspace_folder + '/', '')

    // Use the configurable instruction for code completions copy
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const chatCodeCompletionsInstructions = config.get<string>(
      'chatCodeCompletionsInstructions'
    )

    const instructions = `${chatCodeCompletionsInstructions}${
      current_instruction ? ` Follow suggestions: ${current_instruction}` : ''
    }`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    vscode.env.clipboard.writeText(text)
  } else if (provider.web_mode != 'code-completions') {
    const active_path = active_editor?.document.uri.fsPath
    const context_text = await files_collector.collect_files({
      active_path
    })

    let instructions = replace_selection_placeholder(current_instruction)

    if (instructions.includes('@changes:')) {
      instructions = await replace_changes_placeholder(instructions)
    }

    if (provider.web_mode == 'edit') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const edit_format_instructions = config.get<string>(
        `editFormatInstructions${
          provider.edit_format.charAt(0).toUpperCase() +
          provider.edit_format.slice(1)
        }`
      )
      if (edit_format_instructions) {
        instructions += `\n${edit_format_instructions}`
      }
    }

    const text = `${
      context_text ? `${instructions}\n<files>\n${context_text}</files>\n` : ''
    }${instructions}`

    vscode.env.clipboard.writeText(text)
  } else {
    vscode.window.showWarningMessage(
      'Cannot copy prompt in code completion mode without an active editor.'
    )
    return
  }

  vscode.window.showInformationMessage('Prompt copied to clipboard!')
}
