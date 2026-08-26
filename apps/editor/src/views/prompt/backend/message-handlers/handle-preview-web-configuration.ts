import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { PreviewWebConfigurationMessage } from '@/views/prompt/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { WebConfiguration } from '@shared/types/web-configuration'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { PromptBuilder } from '@/utils/prompt-builder'

export const handle_preview_web_configuration = async (
  prompt_view_provider: PromptViewProvider,
  message: PreviewWebConfigurationMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const current_instructions = prompt_view_provider.current_instruction

  const collected = await FilesCollector.collect_files({
    workspace_provider: prompt_view_provider.workspace_provider,
    open_editors_provider: prompt_view_provider.open_editors_provider
  })
  const context_text = collected.other_files + collected.recent_files

  const { instruction: processed_instructions, skill_definitions } =
    await replace_symbols({
      instruction: current_instructions,
      extension_context: prompt_view_provider.extension_context,
      workspace_provider: prompt_view_provider.workspace_provider,
      remove_images: true
    })

  let formatted_system_instructions = ''
  const user_instructions = processed_instructions
  if (prompt_view_provider.web_prompt_type == 'edit-files') {
    const edit_format_instructions = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
    }[prompt_view_provider.edit_format]
    if (edit_format_instructions) {
      formatted_system_instructions = `# Output formatting\n\n${edit_format_instructions}`
    }
  }

  const { full_prompt: built_prompt } = PromptBuilder.build_prompt({
    context_text,
    skill_definitions,
    system_instructions: formatted_system_instructions,
    user_instructions,
    separator: true
  })
  const text_to_send = built_prompt

  const web_configuration_for_preview: WebConfiguration = {
    name: message.web_configuration.name,
    chatbot: message.web_configuration.chatbot,
    model: message.web_configuration.model,
    reasoning_effort: message.web_configuration.reasoning_effort,
    system_instructions: message.web_configuration.system_instructions,
    options: message.web_configuration.options,
    port: message.web_configuration.port,
    new_url: message.web_configuration.new_url
  }

  const sent =
    await prompt_view_provider.websocket_server_instance.preview_web_configuration(
      {
        instruction: text_to_send,
        web_configuration: web_configuration_for_preview,
        inject_apply_response_button:
          prompt_view_provider.web_prompt_type == 'edit-files',
        raw_instructions: current_instructions
      }
    )

  if (sent) {
    prompt_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Continue in the connected browser',
      type: 'success'
    })
  }
}
