import * as vscode from 'vscode'
import { FilesCollector } from '../utils/files-collector'
import { chat_code_completion_instructions } from '../constants/instructions'
import { replace_saved_context_placeholder } from '../utils/replace-saved-context-placeholder'

async function perform_code_completion_to_clipboard(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider: any,
  with_instructions: boolean = false
) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found.')
    return
  }

  let completion_instructions: string | undefined
  if (with_instructions) {
    completion_instructions = await vscode.window.showInputBox({
      placeHolder: 'Completion instructions',
      prompt: 'E.g. "Include explanatory comments".'
    })

    // If user cancels the input box (not the same as empty input), return
    if (completion_instructions === undefined) {
      return
    }
  }

  const document = editor.document
  const document_path = document.uri.fsPath
  const position = editor.selection.active

  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )

  try {
    const collected_files = await files_collector.collect_files({
      exclude_path: document_path
    })

    const relative_path = vscode.workspace.asRelativePath(document.uri)

    const payload = {
      before: `<files>${collected_files}\n<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const base_instructions = chat_code_completion_instructions(
      relative_path,
      position.line,
      position.character
    )

    let pre_instructions = base_instructions
    let post_instructions = base_instructions

    if (with_instructions && completion_instructions) {
      if (completion_instructions.includes('@SavedContext:')) {
        const pre_user_instructions = await replace_saved_context_placeholder(
          completion_instructions,
          context,
          file_tree_provider
        )
        const post_user_instructions = await replace_saved_context_placeholder(
          completion_instructions,
          context,
          file_tree_provider,
          true
        )
        pre_instructions += ` Follow instructions: ${pre_user_instructions}`
        post_instructions += ` Follow instructions: ${post_user_instructions}`
      } else {
        const user_instructions_part = ` Follow instructions: ${completion_instructions}`
        pre_instructions += user_instructions_part
        post_instructions += user_instructions_part
      }
    }

    const content = `${pre_instructions}\n${payload.before}<missing text>${payload.after}\n${post_instructions}`

    await vscode.env.clipboard.writeText(content)
    vscode.window.showInformationMessage(
      'Code completion prompt has been copied to clipboard.'
    )
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to collect files: ${error.message}`)
  }
}

export function code_completion_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionToClipboard',
    async () => {
      await perform_code_completion_to_clipboard(
        context,
        file_tree_provider,
        open_editors_provider,
        false
      )
    }
  )
}

export function code_completion_with_instructions_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionWithInstructionsToClipboard',
    async () => {
      await perform_code_completion_to_clipboard(
        context,
        file_tree_provider,
        open_editors_provider,
        true
      )
    }
  )
}
