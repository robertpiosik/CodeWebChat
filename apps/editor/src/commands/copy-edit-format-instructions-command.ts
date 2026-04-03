import * as vscode from 'vscode'
import {
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '../constants/edit-format-instructions'

export const copy_edit_format_instructions_command = () => {
  return vscode.commands.registerCommand(
    'codeWebChat.copyEditFormatInstructions',
    async () => {
      const config = vscode.workspace.getConfiguration('codeWebChat')

      const items: vscode.QuickPickItem[] = [
        { label: 'Whole', description: 'Print entire files' },
        { label: 'Truncated', description: 'Truncate unchanged parts' },
        {
          label: 'Before and After',
          description: 'Git-style merge conflict markers'
        },
        { label: 'Diff', description: 'Unified diffs' }
      ]

      const selected = await vscode.window.showQuickPick(items, {
        title: 'Copy Edit Format Instructions',
        placeHolder: 'Select edit format'
      })

      if (!selected) {
        return
      }

      let instructions = ''
      switch (selected.label) {
        case 'Whole':
          instructions =
            config.get<string>('editFormatInstructionsWhole') ||
            EDIT_FORMAT_INSTRUCTIONS_WHOLE
          break
        case 'Truncated':
          instructions =
            config.get<string>('editFormatInstructionsTruncated') ||
            EDIT_FORMAT_INSTRUCTIONS_TRUNCATED
          break
        case 'Diff':
          instructions =
            config.get<string>('editFormatInstructionsDiff') ||
            EDIT_FORMAT_INSTRUCTIONS_DIFF
          break
        case 'Before/After':
          instructions =
            config.get<string>('editFormatInstructionsBeforeAfter') ||
            EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER
          break
      }

      const xml = `<system>\n${instructions}\n</system>`
      await vscode.env.clipboard.writeText(xml)

      vscode.window.showInformationMessage(
        'Edit format instructions copied to clipboard'
      )
    }
  )
}
