import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import {
  code_at_cursor_instructions_for_panel,
  find_relevant_files_instructions,
  find_relevant_files_format_for_panel
} from '@/constants/instructions'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { MODE } from '@/views/panel/types/main-view-mode'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY } from '@/constants/state-keys'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'

export const handle_copy_prompt = async (params: {
  panel_provider: PanelProvider
  instructions: string
  preset_name?: string
}): Promise<void> => {
  const files_collector = new FilesCollector({
    workspace_provider: params.panel_provider.workspace_provider,
    open_editors_provider: params.panel_provider.open_editors_provider
  })

  const active_editor = vscode.window.activeTextEditor

  let final_instruction = params.instructions
  if (params.preset_name !== undefined) {
    final_instruction = apply_preset_affixes_to_instruction({
      instruction: params.instructions,
      preset_name: params.preset_name,
      presets_config_key: params.panel_provider.get_presets_config_key()
    })
  }

  const is_in_code_completions_prompt_type =
    (params.panel_provider.mode == MODE.WEB &&
      params.panel_provider.web_prompt_type == 'code-at-cursor') ||
    (params.panel_provider.mode == MODE.API &&
      params.panel_provider.api_prompt_type == 'code-at-cursor')

  if (
    is_in_code_completions_prompt_type &&
    active_editor &&
    !active_editor.selection.isEmpty
  ) {
    vscode.window.showWarningMessage(
      dictionary.warning_message
        .CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITH_SELECTION
    )
    return
  }

  if (is_in_code_completions_prompt_type && active_editor) {
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

    const system_instructions = code_at_cursor_instructions_for_panel({
      file_path: relative_path,
      row: position.line,
      column: position.character
    })

    const {
      instruction: processed_completion_instructions,
      skill_definitions
    } = await replace_symbols({
      instruction: final_instruction,
      context: params.panel_provider.context,
      workspace_provider: params.panel_provider.workspace_provider,
      remove_images: true
    })

    const missing_text_tag = processed_completion_instructions
      ? `<missing_text>${processed_completion_instructions}</missing_text>`
      : '<missing_text>'

    const text = `<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${missing_text_tag}${text_after_cursor}\n]]>\n</file>\n</files>\n${skill_definitions}${system_instructions}`

    vscode.env.clipboard.writeText(text.trim())
  } else if (!is_in_code_completions_prompt_type) {
    const is_in_find_relevant_files_prompt_type =
      (params.panel_provider.mode == MODE.WEB &&
        params.panel_provider.web_prompt_type == 'find-relevant-files') ||
      (params.panel_provider.mode == MODE.API &&
        params.panel_provider.api_prompt_type == 'find-relevant-files')

    const shrink_source_code =
      params.panel_provider.context.workspaceState.get<boolean>(
        FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY,
        false
      )

    const collected = await files_collector.collect_files({
      no_context: params.panel_provider.web_prompt_type == 'no-context',
      shrink: is_in_find_relevant_files_prompt_type && shrink_source_code
    })
    const context_text = collected.other_files + collected.recent_files

    const { instruction: processed_instructions, skill_definitions } =
      await replace_symbols({
        instruction: final_instruction,
        context: params.panel_provider.context,
        workspace_provider: params.panel_provider.workspace_provider,
        remove_images: true
      })

    let system_instructions_xml = ''

    if (params.panel_provider.web_prompt_type == 'edit-context') {
      const edit_format =
        params.panel_provider.mode == MODE.WEB
          ? params.panel_provider.chat_edit_format
          : params.panel_provider.api_edit_format
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        'before-after': 'editFormatInstructionsBeforeAfter',
        diff: 'editFormatInstructionsDiff'
      }[edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        'before-after': EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
      }[edit_format]
      const edit_format_instructions =
        config.get<string>(instructions_key) || default_instructions
      if (edit_format_instructions) {
        system_instructions_xml = `<system>\n${edit_format_instructions}\n</system>`
      }
    } else if (is_in_find_relevant_files_prompt_type) {
      system_instructions_xml = `${find_relevant_files_format_for_panel}\n${find_relevant_files_instructions}`
    }

    const text = context_text
      ? `<files>\n${context_text}</files>\n${skill_definitions}${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${processed_instructions}`
      : `${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${skill_definitions}${processed_instructions}`
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
