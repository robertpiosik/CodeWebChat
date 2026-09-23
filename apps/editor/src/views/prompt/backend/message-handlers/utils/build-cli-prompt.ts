import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { cli_requirements } from '@/constants/instructions'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'
import * as path from 'path'

export const build_cli_prompt = async (params: {
  prompt_view_provider: PromptViewProvider
  selected_root?: string
}): Promise<string> => {
  const { prompt_view_provider } = params
  let { selected_root } = params

  const current_instructions = prompt_view_provider.current_instructions.trim()

  const { instructions: processed_query, skill_definitions } =
    await replace_symbols({
      instructions: current_instructions,
      extension_context: prompt_view_provider.extension_context,
      workspace_provider: prompt_view_provider.workspace_provider,
      image_as_paths: true
    })

  if (!selected_root) {
    const roots = prompt_view_provider.workspace_provider.get_workspace_roots()
    const last_selected_root =
      prompt_view_provider.extension_context.workspaceState.get<string>(
        'last_selected_workspace_in_headless_cli_state_key'
      )
    selected_root =
      last_selected_root && roots.includes(last_selected_root)
        ? last_selected_root
        : roots[0]
  }

  const checked_files =
    prompt_view_provider.workspace_provider.get_checked_files()

  let files_section = ''
  if (checked_files.length > 0) {
    const relative_paths = checked_files.map((f) => {
      const rel = selected_root ? path.relative(selected_root, f) : f
      return rel.startsWith('..') ? f : rel
    })

    files_section = `# Files\n\n${relative_paths.map((p) => `- \`${p.replace(/\\/g, '/')}\``).join('\n')}`
  }

  let output_formatting_section = ''
  if (prompt_view_provider.cli_prompt_type == 'edit-files') {
    const edit_format_instructions = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF
    }[prompt_view_provider.edit_format]

    if (edit_format_instructions) {
      output_formatting_section = `# Output formatting\n\n${edit_format_instructions}`
    }
  }

  const requirements_section = `# Requirements\n\n${cli_requirements}`
  const task_section = `# Task\n\n${processed_query}`

  const parts = [
    files_section,
    skill_definitions,
    output_formatting_section,
    requirements_section,
    task_section
  ].filter((p) => p.trim() != '')

  return parts.join('\n\n')
}
