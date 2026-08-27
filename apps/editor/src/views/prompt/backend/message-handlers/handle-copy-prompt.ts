import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { PromptBuilder } from '@/utils/prompt-builder'
import { t } from '@/i18n'

export const handle_copy_prompt = async (params: {
  prompt_view_provider: PromptViewProvider
}): Promise<void> => {
  const collected = await FilesCollector.collect_files({
    workspace_provider: params.prompt_view_provider.workspace_provider,
    open_editors_provider: params.prompt_view_provider.open_editors_provider
  })
  const context_text = collected.other_files + collected.recent_files

  const current_instructions = params.prompt_view_provider.current_instructions

  const { instructions: processed_instructions, skill_definitions } =
    await replace_symbols({
      instructions: current_instructions,
      extension_context: params.prompt_view_provider.extension_context,
      workspace_provider: params.prompt_view_provider.workspace_provider,
      remove_images: true
    })

  let formatted_system_instructions = ''
  const user_instructions = processed_instructions

  if (params.prompt_view_provider.prompt_type == 'edit-files') {
    const edit_format = params.prompt_view_provider.edit_format
    const edit_format_instructions = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
    }[edit_format]
    if (edit_format_instructions) {
      formatted_system_instructions = `# Output formatting\n\n${edit_format_instructions}`
    }
  }

  const { full_prompt: text } = PromptBuilder.build_prompt({
    context_text,
    skill_definitions,
    system_instructions: formatted_system_instructions,
    user_instructions,
    separator: true
  })

  vscode.env.clipboard.writeText(text.trim())

  vscode.window.showInformationMessage(t('common.info.copied-to-clipboard'))
}
