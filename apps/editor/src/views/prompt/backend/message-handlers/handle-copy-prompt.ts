import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import {
  code_at_cursor_instructions_for_prompt_view,
  find_relevant_files_instructions,
  find_relevant_files_format_for_prompt_view
} from '@/constants/instructions'
import { MODE } from '@/views/prompt/types/main-view-mode'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { PromptBuilder } from '@/utils/prompt-builder'

export const handle_copy_prompt = async (params: {
  prompt_view_provider: PromptViewProvider
  instructions: string
  web_configuration_name?: string
}): Promise<void> => {
  const files_collector = new FilesCollector({
    workspace_provider: params.prompt_view_provider.workspace_provider,
    open_editors_provider: params.prompt_view_provider.open_editors_provider
  })

  const active_editor = vscode.window.activeTextEditor

  const is_in_code_at_cursor_prompt_type =
    (params.prompt_view_provider.mode == MODE.WEB &&
      params.prompt_view_provider.web_prompt_type == 'code-at-cursor') ||
    (params.prompt_view_provider.mode == MODE.API &&
      params.prompt_view_provider.api_prompt_type == 'code-at-cursor')

  if (
    is_in_code_at_cursor_prompt_type &&
    active_editor &&
    !active_editor.selection.isEmpty
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message
        .CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITH_SELECTION
    )
    return
  }

  if (is_in_code_at_cursor_prompt_type && active_editor) {
    const document = active_editor.document
    const position = active_editor.selection.active
    const active_path = document.uri.fsPath

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const collected = await files_collector.collect_files()
    const context_text = collected.other_files + collected.recent_files

    const workspace_folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    const relative_path = active_path.replace(workspace_folder + '/', '')

    const system_instructions = code_at_cursor_instructions_for_prompt_view({
      file_path: relative_path,
      row: position.line,
      column: position.character
    })

    const {
      instruction: processed_completion_instructions,
      skill_definitions
    } = await replace_symbols({
      instruction: params.instructions,
      extension_context: params.prompt_view_provider.extension_context,
      workspace_provider: params.prompt_view_provider.workspace_provider,
      remove_images: true
    })

    const missing_text_tag = processed_completion_instructions
      ? `<missing_text>${processed_completion_instructions}</missing_text>`
      : '<missing_text>'

    const { full_prompt: text } = PromptBuilder.build_prompt({
      context_text,
      active_file: {
        filepath: relative_path,
        content: `${text_before_cursor}${missing_text_tag}${text_after_cursor}`
      },
      skill_definitions,
      system_instructions
    })

    vscode.env.clipboard.writeText(text.trim())
  } else if (!is_in_code_at_cursor_prompt_type) {
    const is_in_find_relevant_files_prompt_type =
      (params.prompt_view_provider.mode == MODE.WEB &&
        params.prompt_view_provider.web_prompt_type == 'find-relevant-files') ||
      (params.prompt_view_provider.mode == MODE.API &&
        params.prompt_view_provider.api_prompt_type == 'find-relevant-files')

    const shrink_source_code =
      params.prompt_view_provider.extension_context.workspaceState.get<boolean>(
        FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
        false
      )

    const collected = await files_collector.collect_files({
      no_context:
        params.prompt_view_provider.web_prompt_type == 'without-files',
      shrink: is_in_find_relevant_files_prompt_type && shrink_source_code
    })
    const context_text = collected.other_files + collected.recent_files

    const { instruction: processed_instructions, skill_definitions } =
      await replace_symbols({
        instruction: params.instructions,
        extension_context: params.prompt_view_provider.extension_context,
        workspace_provider: params.prompt_view_provider.workspace_provider,
        remove_images: true
      })

    let formatted_system_instructions = ''
    let user_instructions = processed_instructions

    if (params.prompt_view_provider.web_prompt_type == 'edit-files') {
      const edit_format = params.prompt_view_provider.edit_format
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        'search-replace': 'editFormatInstructionsSearchReplace',
        diff: 'editFormatInstructionsDiff'
      }[edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
      }[edit_format]
      const edit_format_instructions =
        config.get<string>(instructions_key) || default_instructions
      if (edit_format_instructions) {
        formatted_system_instructions = `# System\n\n${edit_format_instructions}`
      }
    } else if (is_in_find_relevant_files_prompt_type) {
      formatted_system_instructions = find_relevant_files_format_for_prompt_view

      const config = vscode.workspace.getConfiguration('codeWebChat')
      const base_instructions =
        config.get<string>('findRelevantFilesInstructions') ||
        find_relevant_files_instructions
      user_instructions = `${base_instructions}\n\n${processed_instructions}`
    }

    const { full_prompt: text } = PromptBuilder.build_prompt({
      context_text,
      skill_definitions,
      system_instructions: formatted_system_instructions,
      user_instructions
    })

    vscode.env.clipboard.writeText(text.trim())
  } else {
    vscode.window.showWarningMessage(
      dictionary.warning_message
        .CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITHOUT_EDITOR
    )
    return
  }

  vscode.window.showInformationMessage(
    dictionary.information_message.COPIED_TO_CLIPBOARD
  )
}
