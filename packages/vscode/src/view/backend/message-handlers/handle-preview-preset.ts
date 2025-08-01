import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { PreviewPresetMessage } from '@/view/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_placeholder } from '@/utils/replace-selection-placeholder'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { replace_changes_placeholder } from '@/utils/replace-changes-placeholder'
import { Preset } from '@shared/types/preset'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'

export const handle_preview_preset = async (
  provider: ViewProvider,
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
  let current_instructions = ''
  if (provider.web_mode == 'ask') {
    current_instructions = provider.ask_instructions
  } else if (provider.web_mode == 'edit-context') {
    current_instructions = provider.edit_instructions
  } else if (provider.web_mode == 'no-context') {
    current_instructions = provider.no_context_instructions
  } else if (provider.web_mode == 'code-completions') {
    current_instructions = provider.code_completion_instructions
  }

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
      current_instructions
        ? ` Follow instructions: ${current_instructions}`
        : ''
    }`

    text_to_send = `${instructions}\n<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}<missing text>${text_after_cursor}\n]]>\n</file>\n</files>\n${instructions}`
  } else if (provider.web_mode != 'code-completions') {
    const context_text =
      provider.web_mode != 'no-context'
        ? await files_collector.collect_files()
        : ''

    let instructions = apply_preset_affixes_to_instruction(
      current_instructions,
      message.preset.name,
      provider.get_presets_config_key(),
      {
        promptPrefix: message.preset.prompt_prefix,
        promptSuffix: message.preset.prompt_suffix
      }
    )

    if (active_editor && !active_editor.selection.isEmpty) {
      if (instructions.includes('@Selection')) {
        instructions = replace_selection_placeholder(instructions)
      }
    }

    let pre_context_instructions = instructions
    let post_context_instructions = instructions

    if (pre_context_instructions.includes('@Changes:')) {
      pre_context_instructions = await replace_changes_placeholder(
        pre_context_instructions
      )
    }

    if (pre_context_instructions.includes('@SavedContext:')) {
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
      const all_instructions = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<{ [key: string]: string }>('editFormatInstructions')
      const edit_format_instructions =
        all_instructions?.[provider.chat_edit_format]
      if (edit_format_instructions) {
        pre_context_instructions += `\n${edit_format_instructions}`
        post_context_instructions += `\n${edit_format_instructions}`
      }
    }

    text_to_send = context_text
      ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
      : pre_context_instructions
  } else {
    vscode.window.showWarningMessage(
      'Cannot preview in code completion mode without an active editor.'
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
    system_instructions: message.preset.system_instructions,
    options: message.preset.options,
    port: message.preset.port
  }

  provider.websocket_server_instance.preview_preset(
    text_to_send,
    preset_for_preview
  )
  vscode.window.showInformationMessage(
    'Preset preview sent to the connected browser.'
  )
}
