import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PreviewPresetMessage } from '@/views/panel/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { Preset } from '@shared/types/preset'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'

export const handle_preview_preset = async (
  panel_provider: PanelProvider,
  message: PreviewPresetMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const files_collector = new FilesCollector({
    workspace_provider: panel_provider.workspace_provider,
    open_editors_provider: panel_provider.open_editors_provider
  })

  const active_editor = vscode.window.activeTextEditor
  const active_path = active_editor?.document.uri.fsPath

  let text_to_send: string
  const current_instructions = panel_provider.current_instruction

  if (panel_provider.web_prompt_type == 'code-at-cursor' && active_editor) {
    const document = active_editor.document
    const position = active_editor.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const collected = await files_collector.collect_files()
    const context_text = collected.other_files + collected.recent_files

    const workspace_folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath
    const relative_path = active_path!.replace(workspace_folder + '/', '')

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const system_instructions =
      config.get<string>('chatCodeCompletionsInstructions') || ''

    const {
      instruction: processed_completion_instructions,
      skill_definitions
    } = await replace_symbols({
      instruction: current_instructions,
      context: panel_provider.context,
      workspace_provider: panel_provider.workspace_provider,
      remove_images: true
    })

    const missing_text_tag = processed_completion_instructions
      ? `<missing_text>${processed_completion_instructions}</missing_text>`
      : '<missing_text>'

    text_to_send = `<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${missing_text_tag}${text_after_cursor}\n]]>\n</file>\n</files>\n${skill_definitions}${system_instructions}`
  } else if (panel_provider.web_prompt_type != 'code-at-cursor') {
    const instructions = apply_preset_affixes_to_instruction({
      instruction: current_instructions,
      preset_name: message.preset.name!,
      presets_config_key: panel_provider.get_presets_config_key(),
      override_affixes: {
        promptPrefix: message.preset.prompt_prefix,
        promptSuffix: message.preset.prompt_suffix
      }
    })

    const collected =
      panel_provider.web_prompt_type != 'no-context'
        ? await files_collector.collect_files({})
        : { other_files: '', recent_files: '' }
    const context_text = collected.other_files + collected.recent_files

    const { instruction: processed_instructions, skill_definitions } =
      await replace_symbols({
        instruction: instructions,
        context: panel_provider.context,
        workspace_provider: panel_provider.workspace_provider,
        remove_images: true
      })

    let system_instructions_xml = ''
    if (panel_provider.web_prompt_type == 'edit-context') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const instructions_key = {
        whole: 'editFormatInstructionsWhole',
        truncated: 'editFormatInstructionsTruncated',
        'before-after': 'editFormatInstructionsBeforeAfter',
        diff: 'editFormatInstructionsDiff'
      }[panel_provider.chat_edit_format]
      const default_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        'before-after': EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
      }[panel_provider.chat_edit_format]
      const edit_format_instructions =
        config.get<string>(instructions_key) || default_instructions
      if (edit_format_instructions) {
        system_instructions_xml = `<system>\n${edit_format_instructions}\n</system>`
      }
    }

    text_to_send = context_text
      ? `<files>\n${context_text}</files>\n${skill_definitions}${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${processed_instructions}`
      : `${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${skill_definitions}${processed_instructions}`
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

  const sent = await panel_provider.websocket_server_instance.preview_preset({
    instruction: text_to_send,
    preset: preset_for_preview,
    prompt_type: panel_provider.web_prompt_type,
    raw_instructions: current_instructions
  })

  if (sent) {
    panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Continue in the connected browser',
      type: 'success'
    })
  }
}
