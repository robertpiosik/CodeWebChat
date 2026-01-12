import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { SavedContext } from '@/types/context'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { resolve_context_paths } from '@/commands/apply-context-command/helpers/applying'
import { load_and_merge_global_contexts } from '@/commands/apply-context-command/helpers/saving/global-storage-utils'
import { load_and_merge_file_contexts } from '@/commands/apply-context-command/sources/json-file-source'

async function get_file_content_as_xml(
  file_path: string,
  workspace_provider: WorkspaceProvider
): Promise<string> {
  const workspace_root =
    workspace_provider.get_workspace_root_for_file(file_path)
  if (!workspace_root) return ''

  try {
    const content = await fs.promises.readFile(file_path, 'utf8')
    const workspace_folders = vscode.workspace.workspaceFolders || []
    let relative_path: string
    if (workspace_folders.length > 1) {
      const workspace_name =
        workspace_provider.get_workspace_name(workspace_root)
      relative_path = path.join(
        workspace_name,
        path.relative(workspace_root, file_path)
      )
    } else {
      relative_path = path.relative(workspace_root, file_path)
    }
    return `<file path="${relative_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
  } catch (error) {
    console.error(`Error reading file ${file_path}:`, error)
    return ''
  }
}

const get_context = async (
  source: 'WorkspaceState' | 'JSON',
  name: string,
  context: vscode.ExtensionContext
): Promise<SavedContext | undefined> => {
  if (source == 'WorkspaceState') {
    const { merged } = load_and_merge_global_contexts(context)
    return merged.find((c) => c.name == name)
  } else {
    // JSON
    const { merged } = await load_and_merge_file_contexts()
    return merged.find((c) => c.name == name)
  }
}

export const replace_saved_context_placeholder = async (params: {
  instruction: string
  context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
  just_opening_tag?: boolean
}): Promise<string> => {
  const regex = /#SavedContext:(WorkspaceState|JSON)\s*"([^"]+)"/g
  const matches = [...params.instruction.matchAll(regex)]
  let result_instruction = params.instruction
  const replacements = new Map<string, string>()

  for (const match of matches) {
    const full_match = match[0]
    if (replacements.has(full_match)) continue

    const source = match[1] as 'WorkspaceState' | 'JSON'
    const name = match[2]

    const workspace_root = params.workspace_provider.get_workspace_roots()[0]
    if (!workspace_root) {
      vscode.window.showErrorMessage(dictionary.error_message.NO_WORKSPACE_ROOT)
      continue
    }

    const saved_context = await get_context(source, name, params.context)

    if (!saved_context) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.SAVED_CONTEXT_NOT_FOUND(name, source)
      )
      replacements.set(full_match, '')
      continue
    }

    const resolved_paths = await resolve_context_paths(
      saved_context,
      workspace_root,
      params.workspace_provider
    )

    if (resolved_paths.length == 0) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.NO_VALID_PATHS_IN_CONTEXT(name)
      )
      replacements.set(full_match, '')
      continue
    }

    let replacement_text: string
    if (params.just_opening_tag) {
      replacement_text = `<files name="${name}">`
    } else {
      let context_text = ''
      for (const file_path of resolved_paths) {
        context_text += await get_file_content_as_xml(
          file_path,
          params.workspace_provider
        )
      }

      replacement_text = context_text
        ? `\n<files name="${name}">\n${context_text}</files>`
        : ''
    }
    replacements.set(full_match, replacement_text)
  }

  for (const [placeholder, replacement] of replacements.entries()) {
    const escaped_placeholder = placeholder.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )
    result_instruction = result_instruction.replace(
      new RegExp(`\\s*${escaped_placeholder}\\s*`, 'g'),
      replacement
    )
  }

  return result_instruction
}
