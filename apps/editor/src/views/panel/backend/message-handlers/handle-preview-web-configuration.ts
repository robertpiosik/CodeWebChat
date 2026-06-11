import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PreviewWebConfigurationMessage } from '@/views/panel/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { WebConfiguration } from '@shared/types/web-configuration'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'

export const handle_preview_web_configuration = async (
  panel_provider: PanelProvider,
  message: PreviewWebConfigurationMessage
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

    const collected =
      panel_provider.web_prompt_type != 'no-context'
        ? await files_collector.collect_files({})
        : { other_files: '', recent_files: '' }
    const context_text = collected.other_files + collected.recent_files

    const { instruction: processed_instructions, skill_definitions } =
      await replace_symbols({
        instruction: current_instructions,
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

  const web_configuration_for_preview: WebConfiguration = {
    name: message.web_configuration.name,
    chatbot: message.web_configuration.chatbot,
    model: message.web_configuration.model,
    temperature: message.web_configuration.temperature,
    top_p: message.web_configuration.top_p,
    thinking_budget: message.web_configuration.thinking_budget,
    reasoning_effort: message.web_configuration.reasoning_effort,
    system_instructions: message.web_configuration.system_instructions,
    options: message.web_configuration.options,
    port: message.web_configuration.port,
    new_url: message.web_configuration.new_url
  }

  const sent = await panel_provider.websocket_server_instance.preview_web_configuration({
    instruction: text_to_send,
    web_configuration: web_configuration_for_preview,
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
