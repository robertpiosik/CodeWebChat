import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PreviewPresetMessage } from '@/views/panel/types/messages'
import { FilesCollector } from '@/utils/files-collector'
import { replace_selection_symbol } from '@/views/panel/backend/utils/replace-selection-symbol'
import { replace_saved_context_symbol } from '@/views/panel/backend/utils/replace-saved-context-symbol'
import {
  replace_changes_symbol,
  replace_context_at_commit_symbol,
  replace_commit_symbol
} from '@/views/panel/backend/utils/replace-git-symbols'
import { Preset } from '@shared/types/preset'
import { replace_skill_symbol } from '@/views/panel/backend/utils/replace-skill-symbol'
import { replace_image_symbol } from '@/views/panel/backend/utils/replace-image-symbol'
import { replace_document_symbol } from '../utils/replace-document-symbol'
import { apply_preset_affixes_to_instruction } from '@/utils/apply-preset-affixes'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'

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
  if (panel_provider.web_prompt_type == 'ask-about-context') {
    current_instructions = panel_provider.ask_about_context_instructions
  } else if (panel_provider.web_prompt_type == 'edit-context') {
    current_instructions = panel_provider.edit_context_instructions
  } else if (panel_provider.web_prompt_type == 'no-context') {
    current_instructions = panel_provider.no_context_instructions
  } else if (panel_provider.web_prompt_type == 'code-at-cursor') {
    current_instructions = panel_provider.code_at_cursor_instructions
  }

  if (panel_provider.web_prompt_type == 'code-at-cursor' && active_editor) {
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

    let processed_completion_instructions = current_instructions
    let skill_definitions = ''

    if (processed_completion_instructions.includes('#Selection')) {
      processed_completion_instructions = replace_selection_symbol(
        processed_completion_instructions
      )
    }

    if (processed_completion_instructions.includes('#Changes(')) {
      const result = await replace_changes_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.changes_definitions
    }

    if (processed_completion_instructions.includes('#Commit(')) {
      const result = await replace_commit_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.commit_definitions
    }

    if (processed_completion_instructions.includes('#ContextAtCommit(')) {
      processed_completion_instructions =
        await replace_context_at_commit_symbol({
          instruction: processed_completion_instructions,
          workspace_provider: panel_provider.workspace_provider
        })
    }

    if (processed_completion_instructions.includes('#SavedContext(')) {
      const result = await replace_saved_context_symbol({
        instruction: processed_completion_instructions,
        context: panel_provider.context,
        workspace_provider: panel_provider.workspace_provider
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.context_definitions
    }

    if (processed_completion_instructions.includes('#Skill(')) {
      const result = await replace_skill_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.skill_definitions
    }

    if (processed_completion_instructions.includes('#Image(')) {
      processed_completion_instructions = await replace_image_symbol({
        instruction: processed_completion_instructions,
        remove: true
      })
    }

    if (processed_completion_instructions.includes('#Document(')) {
      processed_completion_instructions = await replace_document_symbol({
        instruction: processed_completion_instructions
      })
    }

    const missing_text_tag = processed_completion_instructions
      ? `<missing_text>${processed_completion_instructions}</missing_text>`
      : '<missing_text>'

    text_to_send = `${system_instructions}\n${skill_definitions}<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}${missing_text_tag}${text_after_cursor}\n]]>\n</file>\n</files>\n${system_instructions}`
  } else if (panel_provider.web_prompt_type != 'code-at-cursor') {
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
      instructions = replace_selection_symbol(instructions)
    }

    let processed_instructions = instructions
    let skill_definitions = ''

    if (processed_instructions.includes('#Changes(')) {
      const result = await replace_changes_symbol({
        instruction: processed_instructions
      })
      processed_instructions = result.instruction
      skill_definitions += result.changes_definitions
    }

    if (processed_instructions.includes('#Commit(')) {
      const result = await replace_commit_symbol({
        instruction: processed_instructions
      })
      processed_instructions = result.instruction
      skill_definitions += result.commit_definitions
    }

    if (processed_instructions.includes('#ContextAtCommit(')) {
      processed_instructions = await replace_context_at_commit_symbol({
        instruction: processed_instructions,
        workspace_provider: panel_provider.workspace_provider
      })
    }

    if (processed_instructions.includes('#SavedContext(')) {
      const result = await replace_saved_context_symbol({
        instruction: processed_instructions,
        context: panel_provider.context,
        workspace_provider: panel_provider.workspace_provider
      })
      processed_instructions = result.instruction
      skill_definitions += result.context_definitions
    }

    if (processed_instructions.includes('#Skill(')) {
      const result = await replace_skill_symbol({
        instruction: processed_instructions
      })
      processed_instructions = result.instruction
      skill_definitions += result.skill_definitions
    }

    if (processed_instructions.includes('#Image(')) {
      processed_instructions = await replace_image_symbol({
        instruction: processed_instructions,
        remove: true
      })
    }

    if (processed_instructions.includes('#Document(')) {
      processed_instructions = await replace_document_symbol({
        instruction: processed_instructions
      })
    }

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
      ? `${
          system_instructions_xml ? system_instructions_xml + '\n' : ''
        }${skill_definitions}<files>\n${context_text}</files>\n${
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

  panel_provider.websocket_server_instance.preview_preset({
    instruction: text_to_send,
    preset: preset_for_preview,
    prompt_type: panel_provider.web_prompt_type,
    raw_instructions: current_instructions
  })
  vscode.window.showInformationMessage(
    dictionary.information_message.PRESET_PREVIEW_SENT_TO_BROWSER
  )
}
