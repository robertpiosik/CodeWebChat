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
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'

export const handle_preview_prompt = async (params: {
  prompt_view_provider: PromptViewProvider
}): Promise<void> => {
  const {
    other_files,
    recent_files,
    processed_instructions,
    skill_definitions
  } = await build_prompt_payload({
    prompt_view_provider: params.prompt_view_provider,
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
    other_files,
    recent_files,
    skill_definitions,
    system_instructions: formatted_system_instructions,
    user_instructions,
    separator: true
  })

  const hash = crypto.createHash('md5').update(`${Date.now()}`).digest('hex')
  const temp_file_path = path.join(os.tmpdir(), `cwc-prompt-${hash}.md`)

  try {
    await fs.promises.writeFile(temp_file_path, text, 'utf8')
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to create temporary file for preview.'
    )
    return
  }

  try {
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(temp_file_path)
    )
    await vscode.window.showTextDocument(document, { preview: false })
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to open view: ${error.message || 'Unknown error'}`
    )
  }
}
