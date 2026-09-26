import * as path from 'path'
import * as fs from 'fs/promises'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { cli_edit_ask_task_scope } from '@/constants/instructions'
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

  const roots = prompt_view_provider.workspace_provider.get_workspace_roots()

  if (!selected_root) {
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
    const root = prompt_view_provider.workspace_provider.get_workspace_root_for_file(f)
    let relative_path = f

    if (root) {
      const rel = path.relative(root, f)
      const temp_rel = roots.length > 1 ? path.join(prompt_view_provider.workspace_provider.get_workspace_name(root), rel) : rel
      relative_path = temp_rel.replace(/\\/g, '/')
    } else {
      const rel = selected_root ? path.relative(selected_root, f) : f
      relative_path = (rel.startsWith('..') ? f : rel).replace(/\\/g, '/')
    }

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

  const output_formatting_section = ''

  const task_scope = are_all_files_preloaded
    ? cli_edit_ask_task_scope.preloaded_files
    : are_any_files_preloaded
    ? cli_edit_ask_task_scope.referenced_files_with_some_preloaded
    : cli_edit_ask_task_scope.referenced_files_only

  const task_scope_section = `# Task scope\n\n${task_scope}`
  const task_section = `# Task\n\n${processed_query}`

  const parts = [
    files_section,
    skill_definitions,
    output_formatting_section,
    task_scope_section,
    task_section
  ].filter((p) => p.trim() != '')

  return parts.join('\n\n')
}
