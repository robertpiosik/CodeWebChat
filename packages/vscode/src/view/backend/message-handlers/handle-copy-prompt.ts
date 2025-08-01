import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { replace_changes_placeholder } from '@/utils/replace-changes-placeholder'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { chat_code_completion_instructions } from '@/constants/instructions'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'

export const handle_copy_prompt = async (
  provider: ViewProvider,
  instructions: string,
  preset_name?: string
): Promise<void> => {
  const files_collector = new FilesCollector(
    provider.workspace_provider,
    provider.open_editors_provider,
    provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor

  let final_instruction = instructions
  if (preset_name !== undefined) {
    final_instruction = apply_preset_affixes_to_instruction(
      instructions,
      preset_name,
      provider.get_presets_config_key()
    )
  }

  const is_in_code_completions_mode =
    (provider.home_view_type == HOME_VIEW_TYPES.WEB &&
      provider.web_mode == 'code-completions') ||
    (provider.home_view_type == HOME_VIEW_TYPES.API &&
      provider.api_mode == 'code-completions')

  if (is_in_code_completions_mode && active_editor) {
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

    const instructions = `${chat_code_completion_instructions(
      relative_path,
      position.line,
      position.character
    )}${final_instruction ? ` Follow instructions: ${final_instruction}` : ''}`

    const text = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`

    vscode.env.clipboard.writeText(text.trim())
  } else if (!is_in_code_completions_mode) {
    const additional_paths = await extract_file_paths_from_instruction(
      final_instruction
    )

    const context_text = await files_collector.collect_files({
      additional_paths,
      no_context: provider.web_mode == 'no-context'
    })

    const instructions = replace_selection_placeholder(final_instruction)

    let pre_context_instructions = instructions
    let post_context_instructions = instructions

    if (instructions.includes('@Changes:')) {
      pre_context_instructions = await replace_changes_placeholder(instructions)
    }

    if (instructions.includes('@SavedContext:')) {
      pre_context_instructions = await replace_saved_context_placeholder(
        pre_context_instructions,
        provider.context,
        provider.workspace_provider
      )
      post_context_instructions = await replace_saved_context_placeholder(
        post_context_instructions,
        provider.context,
        provider.workspace_provider,
        true
      )
    }

    if (provider.web_mode == 'edit-context') {
      const edit_format =
        provider.home_view_type == HOME_VIEW_TYPES.WEB
          ? provider.chat_edit_format
          : provider.api_edit_format
      const all_instructions = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<{ [key: string]: string }>('editFormatInstructions')
      const edit_format_instructions = all_instructions?.[edit_format]

      if (edit_format_instructions) {
        pre_context_instructions += `\n${edit_format_instructions}`
        post_context_instructions += `\n${edit_format_instructions}`
      }
    }

    const text = context_text
      ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
      : pre_context_instructions
    vscode.env.clipboard.writeText(text.trim())
  } else {
    vscode.window.showWarningMessage(
      'Cannot copy prompt in code completion mode without an active editor.'
    )
    return
  }

  vscode.window.showInformationMessage(
    `Prompt${
      preset_name ? ` with preset "${preset_name}"` : ''
    } copied to clipboard!`
  )
}

async function extract_file_paths_from_instruction(
  instruction: string
): Promise<string[]> {
  const matches = instruction.match(/`([^`]+)`/g)
  if (!matches) return []

  return matches.map((match) => match.slice(1, -1)) // Remove backticks
}
