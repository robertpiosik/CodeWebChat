import * as vscode from 'vscode'

export const replace_selection_placeholder = (instruction: string): string => {
  if (!instruction.includes('@Selection')) {
    return instruction
  }

  const active_editor = vscode.window.activeTextEditor
  if (!active_editor || active_editor.selection.isEmpty) {
    // If no selection, just return the original instruction
    vscode.window.showInformationMessage(
      'No text selected for @Selection placeholder.'
    )
    return instruction.replace(/@Selection/g, '')
  }

  const selected_text = active_editor.document.getText(active_editor.selection)
  const document = active_editor.document
  const current_file_path = vscode.workspace.asRelativePath(document.uri)

  const replacement_text = `\n<fragment path="${current_file_path}">\n<![CDATA[\n${selected_text}\n]]>\n</fragment>\n`

  return instruction.replace(/\s*@Selection\s*/g, replacement_text)
}
