import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { SavedContext } from '@/types/context'
import { SAVED_CONTEXTS_STATE_KEY } from '@/constants/state-keys'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { resolve_glob_patterns } from '@/commands/apply-context-command'

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

const get_context = (
  source: 'WorkspaceState' | 'JSON',
  name: string,
  context: vscode.ExtensionContext,
  workspace_root: string
): SavedContext | undefined => {
  if (source == 'WorkspaceState') {
    const internal_contexts: SavedContext[] =
      context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, []) || []
    return internal_contexts.find((c) => c.name == name)
  } else {
    // JSON
    const contexts_file_path = path.join(
      workspace_root,
      '.vscode',
      'contexts.json'
    )
    if (fs.existsSync(contexts_file_path)) {
      try {
        const content = fs.readFileSync(contexts_file_path, 'utf8')
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          const file_contexts = parsed.filter(
            (item): item is SavedContext =>
              typeof item == 'object' &&
              item !== null &&
              typeof item.name == 'string' &&
              Array.isArray(item.paths) &&
              item.paths.every((p: any) => typeof p == 'string')
          )
          return file_contexts.find((c) => c.name == name)
        }
      } catch (e) {
        /* ignore */
      }
    }
  }
  return undefined
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

    const workspace_root = params.workspace_provider.getWorkspaceRoot()
    if (!workspace_root) {
      vscode.window.showErrorMessage('No workspace root found.')
      continue
    }

    const saved_context = get_context(
      source,
      name,
      params.context,
      workspace_root
    )

    if (!saved_context) {
      vscode.window.showWarningMessage(
        `Saved context "${name}" from ${source} not found.`
      )
      replacements.set(full_match, '')
      continue
    }

    // This logic is from apply-context-command.ts
    const workspace_folders = vscode.workspace.workspaceFolders || []
    const workspace_map = new Map<string, string>()
    for (const folder of workspace_folders) {
      workspace_map.set(folder.name, folder.uri.fsPath)
    }

    const absolute_paths = saved_context.paths.map((prefixed_path) => {
      const is_exclude = prefixed_path.startsWith('!')
      const path_part = is_exclude ? prefixed_path.substring(1) : prefixed_path
      let resolved_path_part: string
      if (path_part.includes(':')) {
        const [prefix, relative_path] = path_part.split(':', 2)
        const root = workspace_map.get(prefix)
        if (root) {
          resolved_path_part = path.join(root, relative_path)
        } else {
          resolved_path_part = path.join(workspace_root, relative_path)
        }
      } else {
        resolved_path_part = path.isAbsolute(path_part)
          ? path_part
          : path.join(workspace_root, path_part)
      }
      return is_exclude ? `!${resolved_path_part}` : resolved_path_part
    })

    const resolved_paths = await resolve_glob_patterns(
      absolute_paths,
      params.workspace_provider
    )

    if (resolved_paths.length == 0) {
      vscode.window.showWarningMessage(
        `No valid paths found in context "${name}".`
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
        ? `\n<files name="${name}">\n${context_text}</files>\n`
        : ''
    }
    replacements.set(full_match, replacement_text)
  }

  for (const [placeholder, replacement] of replacements.entries()) {
    result_instruction = result_instruction.replaceAll(placeholder, replacement)
  }

  return result_instruction
}
