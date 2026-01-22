import { PanelProvider } from '@/views/panel/backend/panel-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/views/panel/backend/utils/replace-selection-symbol'
import {
  replace_changes_symbol,
  replace_commit_symbol,
  replace_context_at_commit_symbol
} from '@/views/panel/backend/utils/replace-git-symbols'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import {
  code_completion_instructions_for_panel,
  prune_context_instructions_prefix,
  prune_context_format
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

    let processed_completion_instructions = final_instruction

    if (processed_completion_instructions.includes('#Selection')) {
      processed_completion_instructions = replace_selection_placeholder(
        processed_completion_instructions
      )
    }

    if (processed_completion_instructions.includes('#Changes:')) {
      processed_completion_instructions = await replace_changes_symbol({
        instruction: processed_completion_instructions
      })
    }

    if (processed_completion_instructions.includes('#Commit:')) {
      processed_completion_instructions = await replace_commit_symbol({
        instruction: processed_completion_instructions
      })
    }

    if (processed_completion_instructions.includes('#ContextAtCommit:')) {
      processed_completion_instructions =
        await replace_context_at_commit_symbol({
          instruction: processed_completion_instructions,
          workspace_provider: params.panel_provider.workspace_provider
        })
    }

    if (processed_completion_instructions.includes('#SavedContext:')) {
      processed_completion_instructions =
        await replace_saved_context_placeholder({
          instruction: processed_completion_instructions,
          context: params.panel_provider.context,
          workspace_provider: params.panel_provider.workspace_provider
        })
    }

    const missing_text_tag = processed_completion_instructions
      ? `<missing_text>${processed_completion_instructions}</missing_text>`
      : '<missing_text>'

    const text = `${system_instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${missing_text_tag}${text_after_cursor}\n]]>\n</file>\n</files>\n${system_instructions}`

    vscode.env.clipboard.writeText(text.trim())
  } else if (!is_in_code_completions_prompt_type) {
    const is_in_prune_context_prompt_type =
      (params.panel_provider.mode == MODE.WEB &&
        params.panel_provider.web_prompt_type == 'prune-context') ||
      (params.panel_provider.mode == MODE.API &&
        params.panel_provider.api_prompt_type == 'prune-context')

    const context_text = await files_collector.collect_files({
      no_context: params.panel_provider.web_prompt_type == 'no-context',
      compact: is_in_prune_context_prompt_type
    })

    const instructions = replace_selection_placeholder(final_instruction)

    let processed_instructions = instructions

    if (processed_instructions.includes('#Changes:')) {
      processed_instructions = await replace_changes_symbol({
        instruction: processed_instructions
      })
    }

    if (processed_instructions.includes('#Commit:')) {
      processed_instructions = await replace_commit_symbol({
        instruction: processed_instructions
      })
    }

    if (processed_instructions.includes('#ContextAtCommit:')) {
      processed_instructions = await replace_context_at_commit_symbol({
        instruction: processed_instructions,
        workspace_provider: params.panel_provider.workspace_provider
      })
    }

    if (processed_instructions.includes('#SavedContext:')) {
      processed_instructions = await replace_saved_context_placeholder({
        instruction: processed_instructions,
        context: params.panel_provider.context,
        workspace_provider: params.panel_provider.workspace_provider
      })
    }

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
    } else if (is_in_prune_context_prompt_type) {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const config_prune_instructions_prefix = config.get<string>(
        'pruneContextInstructionsPrefix'
      )
      const instructions_to_use =
        config_prune_instructions_prefix || prune_context_instructions_prefix
      system_instructions_xml = `${instructions_to_use}\n${prune_context_format}`
    }

    const text = context_text
      ? `${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }<files>\n${context_text}</files>\n${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${processed_instructions}`
      : `${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${processed_instructions}`
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
