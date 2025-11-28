import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PreviewPresetMessage } from '@/views/panel/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/views/panel/backend/utils/replace-selection-placeholder'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import {
  replace_changes_placeholder, replace_context_at_commit_placeholder,
  replace_commit_placeholder
} from '@/views/panel/backend/utils/replace-git-placeholders'
import { Preset } from '@shared/types/preset'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { MODE } from '@/views/panel/types/main-view-mode'
import { dictionary } from '@shared/constants/dictionary'

export const handle_preview_preset = async (
  panel_provider: PanelProvider,
  message: PreviewPresetMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector(
    panel_provider.workspace_provider,
    panel_provider.open_editors_provider,
    panel_provider.websites_provider
  )

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  let text_to_send: string
  let current_instructions = ''
  if (panel_provider.web_prompt_type == 'ask') {
    current_instructions = panel_provider.ask_instructions
  } else if (panel_provider.web_prompt_type == 'edit-context') {
    current_instructions = panel_provider.edit_instructions
  } else if (panel_provider.web_prompt_type == 'no-context') {
    current_instructions = panel_provider.no_context_instructions
  } else if (panel_provider.web_prompt_type == 'code-completions') {
    current_instructions = panel_provider.code_completion_instructions
  }

  if (panel_provider.web_prompt_type == 'code-completions' && active_editor) {
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
    const system_instructions =
      config.get<string>('chatCodeCompletionsInstructions') || ''

    const missing_text_tag = current_instructions
      ? `<missing_text>${current_instructions}</missing_text>`
      : '<missing_text>'

    text_to_send = `${system_instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${missing_text_tag}${text_after_cursor}\n]]>\n</file>\n</files>\n${system_instructions}`
  } else if (panel_provider.web_prompt_type != 'code-completions') {
    let instructions = apply_preset_affixes_to_instruction({
      instruction: current_instructions,
      preset_name: message.preset.name!,
      presets_config_key: panel_provider.get_presets_config_key(),
      override_affixes: {
        promptPrefix: message.preset.prompt_prefix,
        promptSuffix: message.preset.prompt_suffix
      }
    })

    const has_selection =
      !!active_editor &&
      !active_editor.selection.isEmpty &&
      instructions.includes('#Selection')

    const context_text =
      panel_provider.web_prompt_type != 'no-context'
        ? await files_collector.collect_files({})
        : ''

    if (has_selection) {
      instructions = replace_selection_placeholder(instructions)
    }

    let pre_context_instructions = instructions
    let post_context_instructions = instructions

    if (pre_context_instructions.includes('#Changes:')) {
      const is_no_context_web_mode =
        panel_provider.mode == MODE.WEB &&
        panel_provider.web_prompt_type == 'no-context'

      pre_context_instructions = await replace_changes_placeholder({
        instruction: pre_context_instructions,
        workspace_provider: panel_provider.workspace_provider,
        is_no_context_web_mode
      })
      post_context_instructions = await replace_changes_placeholder({
        instruction: post_context_instructions,
        after_context: true,
        workspace_provider: panel_provider.workspace_provider
      })
    }

    if (pre_context_instructions.includes('#Commit:')) {
      pre_context_instructions = await replace_commit_placeholder({
        instruction: pre_context_instructions
      })
      post_context_instructions = await replace_commit_placeholder({
        instruction: post_context_instructions,
        after_context: true
      })
    }

    if (pre_context_instructions.includes('#ContextAtCommit:')) {
      pre_context_instructions = await replace_context_at_commit_placeholder({
        instruction: pre_context_instructions,
        workspace_provider: panel_provider.workspace_provider
      })
      post_context_instructions = await replace_context_at_commit_placeholder({
        instruction: post_context_instructions,
        after_context: true,
        workspace_provider: panel_provider.workspace_provider
      })
    }

    if (pre_context_instructions.includes('#SavedContext:')) {
      pre_context_instructions = await replace_saved_context_placeholder({
        instruction: pre_context_instructions,
        context: panel_provider.context,
        workspace_provider: panel_provider.workspace_provider
      })
      post_context_instructions = await replace_saved_context_placeholder({
        instruction: post_context_instructions,
        context: panel_provider.context,
        workspace_provider: panel_provider.workspace_provider,
        just_opening_tag: true
      })
    }

    if (panel_provider.web_prompt_type == 'edit-context') {
      const all_instructions = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<{ [key: string]: string }>('editFormatInstructions')
      const edit_format_instructions =
        all_instructions?.[panel_provider.chat_edit_format]
      if (edit_format_instructions) {
        const system_instructions = `<system>\n${edit_format_instructions}\n</system>`
        pre_context_instructions += `\n${system_instructions}`
        post_context_instructions += `\n${system_instructions}`
      }
    }

    text_to_send = context_text
      ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
      : pre_context_instructions
  } else {
    vscode.window.showWarningMessage(
      dictionary.warning_message
        .CANNOT_PREVIEW_IN_CODE_COMPLETION_WITHOUT_EDITOR
    )
    return
  }

  const preset_for_preview: Preset = {
    name: message.preset.name,
    chatbot: message.preset.chatbot,
    prompt_prefix: message.preset.prompt_prefix,
    prompt_suffix: message.preset.prompt_suffix,
    model: message.preset.model,
    temperature: message.preset.temperature,
    top_p: message.preset.top_p,
    thinking_budget: message.preset.thinking_budget,
    reasoning_effort: message.preset.reasoning_effort,
    system_instructions: message.preset.system_instructions,
    options: message.preset.options,
    port: message.preset.port,
    new_url: message.preset.new_url
  }

  panel_provider.websocket_server_instance.preview_preset({
    instruction: text_to_send,
    preset: preset_for_preview,
    mode: panel_provider.web_prompt_type,
    raw_instructions: current_instructions
  })
  vscode.window.showInformationMessage(
    dictionary.information_message.PRESET_PREVIEW_SENT_TO_BROWSER
  )
}
