import * as path from 'path'
import * as fs from 'fs/promises'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { cli_requirements } from '@/constants/instructions'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'
import { LAST_SELECTED_WORKSPACE_IN_AGENTIC_CLI_STATE_KEY } from '@/constants/state-keys'

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
        LAST_SELECTED_WORKSPACE_IN_AGENTIC_CLI_STATE_KEY
      )
    selected_root =
      last_selected_root && roots.includes(last_selected_root)
        ? last_selected_root
        : roots[0]
  }

  const checked_files =
    prompt_view_provider.workspace_provider.get_checked_files()

  const files_data: { relative_path: string; content?: string }[] = []
  let total_content_length = 0

  for (const f of checked_files) {
    const rel = selected_root ? path.relative(selected_root, f) : f
    const relative_path = (rel.startsWith('..') ? f : rel).replace(/\\/g, '/')

    try {
      const content = await fs.readFile(f, 'utf8')
      files_data.push({ relative_path, content })
      total_content_length += content.length
    } catch (err) {
      files_data.push({ relative_path, content: undefined })
    }
  }

  let files_section = ''
  let are_all_files_preloaded = false
  let are_any_files_preloaded = false

  if (total_content_length <= 20000) {
    are_all_files_preloaded = true
    are_any_files_preloaded = files_data.length > 0
    const file_blocks = files_data.map((data) =>
      data.content !== undefined
        ? `### File: \`${data.relative_path}\`\n\n\`\`\`\n${data.content}\n\`\`\``
        : `### File: \`${data.relative_path}\`\n\n\`\`\`\n\n\`\`\``
    )

    files_section = `# Files\n\n${file_blocks.join('\n\n')}`
  } else {
    const file_blocks: string[] = []
    let total_inlined_characters = 0

    for (const data of files_data) {
      if (data.content !== undefined) {
        if (
          data.content.length <= 1000 &&
          total_inlined_characters + data.content.length <= 20000
        ) {
          total_inlined_characters += data.content.length
          file_blocks.push(
            `### File: \`${data.relative_path}\`\n\n\`\`\`\n${data.content}\n\`\`\``
          )
          are_any_files_preloaded = true
        } else {
          file_blocks.push(`### Large file: \`${data.relative_path}\``)
        }
      } else {
        file_blocks.push(`### File: \`${data.relative_path}\`\n\n\`\`\`\n\n\`\`\``)
        are_any_files_preloaded = true
      }
    }

    files_section = `# Files\n\n${file_blocks.join('\n\n')}`
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

  const requirement = are_all_files_preloaded
    ? cli_requirements.preloaded_files
    : are_any_files_preloaded
    ? cli_requirements.referenced_files_with_some_preloaded
    : cli_requirements.referenced_files_only

  const requirements_section = `# Requirements\n\n${requirement}`
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
