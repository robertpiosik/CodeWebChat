import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { resolve_context_paths } from '@/commands/apply-context-command/helpers/applying/resolve-context-paths'
import { load_and_merge_global_contexts } from '@/commands/apply-context-command/helpers/saving/global-storage-utils'
import { load_and_merge_file_contexts } from '@/commands/apply-context-command/sources/json-file-source'
import { Logger } from '@shared/utils/logger'

export const replace_saved_context_symbol = async (params: {
  instruction: string
  context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
}): Promise<{ instruction: string; context_definitions: string }> => {
  const regex = /#SavedContext\(([^)]+)\)/g
  let result_instruction = params.instruction
  let context_definitions = ''

  const matches = [...result_instruction.matchAll(regex)]
  if (matches.length === 0) {
    return { instruction: result_instruction, context_definitions: '' }
  }

  const { merged: internal_contexts } = load_and_merge_global_contexts(
    params.context
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

    const saved_context = all_contexts.find((c) => c.name === context_name)

    if (!saved_context) {
      vscode.window.showWarningMessage(
        `Saved context "${context_name}" not found.`
      )
      result_instruction = result_instruction.replace(full_match, '')
      continue
    }

    const paths = await resolve_context_paths(
      saved_context,
      params.workspace_provider.get_workspace_roots()[0] || '',
      params.workspace_provider
    )

    let files_xml = ''
    for (const p of paths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          const content = fs.readFileSync(p, 'utf-8')
          const root = params.workspace_provider.get_workspace_root_for_file(p)
          const relative_path = root ? path.relative(root, p) : p

          files_xml += `<file path="${relative_path.replace(
            /\\/g,
            '/'
          )}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
        }
      } catch (error) {
        Logger.warn({
          function_name: 'replace_saved_context_symbol',
          message: `Failed to read file ${p} from saved context ${context_name}`,
          data: error
        })
      }
    }

    if (files_xml) {
      context_definitions += `<context name="${context_name}">\n${files_xml}</context>\n`
    }

    result_instruction = result_instruction.replace(
      full_match,
      () => `<context name="${context_name}" />`
    )
  }

  return { instruction: result_instruction, context_definitions }
}
