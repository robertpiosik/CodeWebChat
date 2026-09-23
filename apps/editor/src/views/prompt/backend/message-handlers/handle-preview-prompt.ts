import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { build_prompt_payload } from './utils/build-prompt-payload'
import { build_cli_prompt } from './utils/build-cli-prompt'
import { TARGET } from '@shared/types/target'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { PromptBuilder } from '@/utils/prompt-builder'
import { preview_text_in_temp_file } from '../utils/preview-text-in-temp-file'
import * as vscode from 'vscode'
import { t } from '@/i18n'

export const handle_preview_prompt = async (params: {
  prompt_view_provider: PromptViewProvider
}): Promise<void> => {
  const current_instructions =
    params.prompt_view_provider.current_instructions.trim()

  if (!current_instructions) {
    vscode.window.showInformationMessage(
      t('views.common.handlers.common.instructions-cannot-be-empty')
    )
    return
  }

  let text = ''

  if (params.prompt_view_provider.target == TARGET.CLI) {
    text = await build_cli_prompt({
      prompt_view_provider: params.prompt_view_provider
    })
  } else {
    const {
      other_files,
      recent_files,
      collected_files,
      processed_instructions,
      skill_definitions
    } = await build_prompt_payload({
      prompt_view_provider: params.prompt_view_provider,
      remove_images: true
    })

    if (!collected_files) {
      vscode.window.showInformationMessage(
        t('views.common.handlers.common.context-cannot-be-empty')
      )
      return
    }

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

    const build_result = PromptBuilder.build_prompt({
      other_files,
      recent_files,
      skill_definitions,
      system_instructions: formatted_system_instructions,
      user_instructions,
      separator: true
    })
    text = build_result.full_prompt
  }

  await preview_text_in_temp_file({
    prefix: 'cwc-prompt',
    content: text,
    extension: '.md'
  })
}
