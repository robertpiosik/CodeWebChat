import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/views/panel/backend/utils/replace-selection-placeholder'
import {
  replace_changes_placeholder,
  replace_commit_placeholder,
  replace_context_at_commit_placeholder
} from '@/views/panel/backend/utils/replace-git-placeholders'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { code_completion_instructions_for_panel } from '@/constants/instructions'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { MODE } from '@/views/panel/types/main-view-mode'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

export const handle_copy_prompt = async (params: {
  panel_provider: PanelProvider
  instructions: string
  preset_name?: string
}): Promise<void> => {
  const files_collector = new FilesCollector(
    params.panel_provider.workspace_provider,
    params.panel_provider.open_editors_provider,
    params.panel_provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor

  let final_instruction = params.instructions
  if (params.preset_name !== undefined) {
    final_instruction = apply_preset_affixes_to_instruction({
      instruction: params.instructions,
      preset_name: params.preset_name,
      presets_config_key: params.panel_provider.get_presets_config_key()
    })
  }

  const is_in_code_completions_mode =
    (params.panel_provider.mode == MODE.WEB &&
      params.panel_provider.web_prompt_type == 'code-completions') ||
    (params.panel_provider.mode == MODE.API &&
      params.panel_provider.api_prompt_type == 'code-completions')

  if (
    is_in_code_completions_mode &&
    active_editor &&
    !active_editor.selection.isEmpty
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message
        .CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITH_SELECTION
    )
    return
  }

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

    const system_instructions = code_completion_instructions_for_panel(
      relative_path,
      position.line,
      position.character
    )
    const missing_text_tag = final_instruction
      ? `<missing_text>${final_instruction}</missing_text>`
      : '<missing_text>'

    const text = `${system_instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${missing_text_tag}${text_after_cursor}\n]]>\n</file>\n</files>\n${system_instructions}`

    vscode.env.clipboard.writeText(text.trim())
  } else if (!is_in_code_completions_mode) {
    const context_text = await files_collector.collect_files({
      no_context: params.panel_provider.web_prompt_type == 'no-context'
    })

    if (
      params.panel_provider.web_prompt_type == 'edit-context' &&
      !context_text
    ) {
      vscode.window.showWarningMessage(
        dictionary.warning_message
          .CANNOT_COPY_PROMPT_IN_EDIT_CONTEXT_WITHOUT_CONTEXT
      )
      return
    }

    const instructions = replace_selection_placeholder(final_instruction)

    let pre_context_instructions = instructions
    let post_context_instructions = instructions

    if (instructions.includes('#Changes:')) {
      const is_no_context_web_mode =
        params.panel_provider.mode == MODE.WEB &&
        params.panel_provider.web_prompt_type == 'no-context'

      pre_context_instructions = await replace_changes_placeholder({
        instruction: pre_context_instructions,
        workspace_provider: params.panel_provider.workspace_provider,
        is_no_context_web_mode
      })
      post_context_instructions = await replace_changes_placeholder({
        instruction: post_context_instructions,
        after_context: true,
        workspace_provider: params.panel_provider.workspace_provider
      })
    }

    if (instructions.includes('#Commit:')) {
      pre_context_instructions = await replace_commit_placeholder({
        instruction: pre_context_instructions
      })
      post_context_instructions = await replace_commit_placeholder({
        instruction: post_context_instructions,
        after_context: true
      })
    }

    if (instructions.includes('#ContextAtCommit:')) {
      pre_context_instructions = await replace_context_at_commit_placeholder({
        instruction: pre_context_instructions,
        workspace_provider: params.panel_provider.workspace_provider
      })
      post_context_instructions = await replace_context_at_commit_placeholder({
        instruction: post_context_instructions,
        after_context: true,
        workspace_provider: params.panel_provider.workspace_provider
      })
    }

    if (instructions.includes('#SavedContext:')) {
      pre_context_instructions = await replace_saved_context_placeholder({
        instruction: pre_context_instructions,
        context: params.panel_provider.context,
        workspace_provider: params.panel_provider.workspace_provider
      })
      post_context_instructions = await replace_saved_context_placeholder({
        instruction: post_context_instructions,
        context: params.panel_provider.context,
        workspace_provider: params.panel_provider.workspace_provider,
        just_opening_tag: true
      })
    }

    if (params.panel_provider.web_prompt_type == 'edit-context') {
      const edit_format =
        params.panel_provider.mode == MODE.WEB
          ? params.panel_provider.chat_edit_format
          : params.panel_provider.api_edit_format
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        diff: 'editFormatInstructionsDiff'
      }[edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
      }[edit_format]
      const edit_format_instructions = config.get<string>(
        instructions_key,
        
      ) ||default_instructions
      if (edit_format_instructions) {
        const system_instructions = `<system>\n${edit_format_instructions}\n</system>`
        pre_context_instructions += `\n${system_instructions}`
        post_context_instructions += `\n${system_instructions}`
      }
    }

    const text = context_text
      ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
      : pre_context_instructions
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
