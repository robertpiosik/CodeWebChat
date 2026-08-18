import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import {
  resolve_context_paths,
  load_and_merge_global_contexts,
  load_and_merge_file_contexts
} from '@/features/context-restoration'
import { Logger } from '@shared/utils/logger'

export const replace_saved_context_symbol = async (params: {
  instruction: string
  extension_context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
}): Promise<{ instruction: string; context_definitions: string }> => {
  const regex = /#SavedContext\(([^)]+)\)/g
  let result_instruction = params.instruction
  let context_definitions = ''

  const matches = [...result_instruction.matchAll(regex)]
  if (matches.length == 0) {
    return { instruction: result_instruction, context_definitions: '' }
  }

  const { merged: internal_contexts } = load_and_merge_global_contexts(
    params.extension_context
  )
  const { merged: file_contexts } = await load_and_merge_file_contexts()

  const all_contexts = [...internal_contexts, ...file_contexts]

  for (const match of matches) {
    const full_match = match[0]
    let context_name = match[1].trim()

    // Handle quoted names or prefixed names like: WorkspaceState "a"
    const quoted_match = context_name.match(/["']([^"']+)["']$/)
    if (quoted_match) {
      context_name = quoted_match[1]
    }

    const escaped_match = full_match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const replacement_regex = new RegExp(`\\s*${escaped_match}\\s*`, 'g')

    if (!result_instruction.match(replacement_regex)) {
      continue
    }

    const saved_context = all_contexts.find((c) => c.name === context_name)

    if (!saved_context) {
      vscode.window.showWarningMessage(
        `Saved context "${context_name}" not found.`
      )
      result_instruction = result_instruction.replace(replacement_regex, ' ')
      continue
    }

    const paths = await resolve_context_paths({
      context: saved_context,
      workspace_root: params.workspace_provider.get_workspace_roots()[0] || '',
      workspace_provider: params.workspace_provider
    })

    let files_markdown = ''
    for (const p of paths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const content = fs.readFileSync(p, 'utf-8')
          const root = params.workspace_provider.get_workspace_root_for_file(p)
          const relative_path = root ? path.relative(root, p) : p

          const backticks = content.includes('```') ? '````' : '```'
          files_markdown += `- File: \`${relative_path.replace(
            /\\/g,
            '/'
          )}\`\n\n${backticks}\n${content}\n${backticks}\n\n`
        }
      } catch (error) {
        Logger.warn({
          function_name: 'replace_saved_context_symbol',
          message: `Failed to read file ${p} from saved context ${context_name}`,
          data: error
        })
      }
    }

    if (files_markdown) {
      context_definitions += `# ${context_name}\n\n${files_markdown}`
    }

    const link_hash = context_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    result_instruction = result_instruction.replace(
      replacement_regex,
      ` [${context_name}](#${link_hash}) `
    )
  }

  return { instruction: result_instruction, context_definitions }
}
