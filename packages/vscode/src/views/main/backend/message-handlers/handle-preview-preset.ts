import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { PreviewPresetMessage } from '@/views/main/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { replace_changes_placeholder } from '@/utils/replace-changes-placeholder'

export const handle_preview_preset = async (
  provider: MainViewProvider,
  message: PreviewPresetMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    provider.workspace_provider,
    provider.open_editors_provider,
    provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  let text_to_send: string
  const current_instructions =
    provider.web_mode != 'code-completions'
      ? provider.instructions
      : provider.code_completion_suggestions

  if (provider.web_mode == 'code-completions' && active_editor) {
    const document = active_editor.document
    const position = active_editor.selection.active

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
    const relative_path = active_path!.replace(workspace_folder + '/', '')

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const chat_code_completion_instructions = config.get<string>(
      'chatCodeCompletionsInstructions'
    )

    const instructions = `${chat_code_completion_instructions}${
      current_instructions ? ` Follow suggestions: ${current_instructions}` : ''
    }`

    text_to_send = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`
  } else if (provider.web_mode != 'code-completions') {
    const context_text = await files_collector.collect_files({
      active_path
    })

    let instructions = replace_selection_placeholder(current_instructions)

    if (instructions.includes('@changes:')) {
      instructions = await replace_changes_placeholder(instructions)
    }

    if (message.preset.prompt_prefix) {
      instructions = message.preset.prompt_prefix + '\n' + instructions
    }
    if (message.preset.prompt_suffix) {
      instructions = instructions + '\n' + message.preset.prompt_suffix
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

    text_to_send = `${
      context_text ? `${instructions}\n<files>\n${context_text}</files>\n` : ''
    }${instructions}`
  } else {
    vscode.window.showWarningMessage(
      'Cannot preview in code completion mode without an active editor.'
    )
    return
  }

  provider.websocket_server_instance.preview_preset(
    text_to_send,
    message.preset
  )
  vscode.window.showInformationMessage(
    'Preset preview sent to the connected browser.'
  )
}
