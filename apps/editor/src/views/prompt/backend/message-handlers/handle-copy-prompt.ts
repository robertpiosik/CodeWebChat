import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import * as vscode from 'vscode'
import { build_prompt_payload } from './utils/build-prompt-payload'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { PromptBuilder } from '@/utils/prompt-builder'
import { t } from '@/i18n'

export const handle_copy_prompt = async (params: {
  prompt_view_provider: PromptViewProvider
}): Promise<void> => {
  const {
    other_files,
    recent_files,
    collected_files,
    processed_instructions,
    processed_completed_tasks,
    skill_definitions
  } = await build_prompt_payload({
    prompt_view_provider: params.prompt_view_provider,
    remove_images: true
  })

  if (!collected_files) {
    vscode.window.showWarningMessage(
      t('views.common.handlers.common.context-cannot-be-empty')
    )
    return
  }

  let output_formatting: string | undefined = undefined
  let completed_tasks: string[] | undefined = undefined
  const user_instructions = processed_instructions

  if (params.prompt_view_provider.prompt_type == 'edit') {
    completed_tasks = processed_completed_tasks
    const edit_format = params.prompt_view_provider.edit_format
    output_formatting = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
    }[edit_format]
  }

  const build_result = PromptBuilder.build_prompt({
    files_context_part1: other_files,
    files_context_part2: recent_files,
    skill_definitions,
    output_formatting,
    completed_tasks,
    user_instructions
  })
  const text = build_result.full_prompt

  vscode.env.clipboard.writeText(text.trim())

  vscode.window.showInformationMessage(
    t('common.info.copied-to-clipboard', { item: 'Prompt' })
  )
}
