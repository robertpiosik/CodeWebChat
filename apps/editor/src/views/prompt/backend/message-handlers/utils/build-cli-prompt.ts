import * as path from 'path'
import * as fs from 'fs/promises'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { cli_edit_ask_requirements } from '@/constants/instructions'
import { LAST_SELECTED_WORKSPACE_IN_AGENTIC_CLI_STATE_KEY } from '@/constants/state-keys'
import { PromptBuilder } from '@/utils/prompt-builder'

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

  let files_context = ''

  for (const f of checked_files) {
    const root =
      prompt_view_provider.workspace_provider.get_workspace_root_for_file(f)
    let relative_path = f

    if (root) {
      const rel = path.relative(root, f)
      const temp_rel =
        roots.length > 1
          ? path.join(
              prompt_view_provider.workspace_provider.get_workspace_name(root),
              rel
            )
          : rel
      relative_path = temp_rel.replace(/\\/g, '/')
    } else {
      const rel = selected_root ? path.relative(selected_root, f) : f
      relative_path = (rel.startsWith('..') ? f : rel).replace(/\\/g, '/')
    }

    try {
      const content = await fs.readFile(f, 'utf8')
      files_context += PromptBuilder.build_file_context({
        filepath: relative_path,
        content
      })
    } catch (err) {
      files_context += PromptBuilder.build_file_context({
        filepath: relative_path
      })
    }
  }

  const requirements_list = [cli_edit_ask_requirements.preloaded_context]
  requirements_list.push(cli_edit_ask_requirements.restrict_shell_commands)

  if (prompt_view_provider.cli_prompt_type == 'edit-files') {
    requirements_list.push(cli_edit_ask_requirements.exception_read_images)
    requirements_list.push(
      cli_edit_ask_requirements.exception_allow_file_system_operations
    )
  } else {
    requirements_list.push(cli_edit_ask_requirements.exception_read_images)
  }

  const build_result = PromptBuilder.build_prompt({
    files_context,
    skill_definitions,
    requirements: requirements_list,
    user_instructions: processed_query
  })

  return build_result.full_prompt
}
