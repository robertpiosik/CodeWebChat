import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'

export const group_files_by_workspace = (
  checked_files: string[]
): Map<string, string[]> => {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const files_by_workspace = new Map<string, string[]>()

  workspace_folders.forEach((folder) => {
    files_by_workspace.set(folder.uri.fsPath, [])
  })

  for (const file of checked_files) {
    const workspace = workspace_folders.find((folder) =>
      file.startsWith(folder.uri.fsPath)
    )

    if (workspace) {
      const files = files_by_workspace.get(workspace.uri.fsPath) || []
      files.push(file)
      files_by_workspace.set(workspace.uri.fsPath, files)
    }
  }

  return files_by_workspace
}

export const condense_paths = (
  paths: string[],
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): string[] => {
  const relative_paths = paths.map((p) => path.relative(workspace_root, p))
  const selected_paths_set = new Set(relative_paths)

  const dir_to_children: Map<string, string[]> = new Map()

  for (const rel_path of relative_paths) {
    const parent_dir = path.dirname(rel_path)
    if (!dir_to_children.has(parent_dir)) {
      dir_to_children.set(parent_dir, [])
    }
    dir_to_children.get(parent_dir)!.push(rel_path)
  }

  const are_all_files_selected = (
    dir_path: string,
    condensed_paths_set: Set<string>
  ): boolean => {
    try {
      if (selected_paths_set.has(dir_path)) {
        return true
      }

      const abs_dir_path = path.join(workspace_root, dir_path)
      if (
        !fs.existsSync(abs_dir_path) ||
        !fs.lstatSync(abs_dir_path).isDirectory()
      ) {
        return false
      }

      const all_entries = fs.readdirSync(abs_dir_path)

      for (const entry of all_entries) {
        const entry_path = path.join(dir_path, entry)
        const abs_entry_path = path.join(workspace_root, entry_path)

        const current_workspace_root =
          workspace_provider.get_workspace_root_for_file(abs_entry_path) ||
          workspace_root
        const relative_entry_path = path.relative(
          current_workspace_root,
          abs_entry_path
        )
        if (workspace_provider.is_excluded(relative_entry_path)) {
          continue
        }

        if (workspace_provider.is_ignored_by_patterns(abs_entry_path)) {
          continue
        }

        if (fs.lstatSync(abs_entry_path).isDirectory()) {
          if (
            !condensed_paths_set.has(entry_path) &&
            !are_all_files_selected(entry_path, condensed_paths_set)
          ) {
            return false
          }
        } else {
          if (!selected_paths_set.has(entry_path)) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      console.error(`Error checking directory ${dir_path}:`, error)
      return false
    }
  }

  const condensed_paths = new Set(relative_paths)

  const all_dirs_set = new Set<string>()
  for (const dir of dir_to_children.keys()) {
    let current_dir = dir
    while (current_dir !== '.' && current_dir !== '/') {
      all_dirs_set.add(current_dir)
      current_dir = path.dirname(current_dir)
    }
  }

  const directories = Array.from(all_dirs_set)
  directories.sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length
  )

  for (const dir of directories) {
    if (dir == '.') continue

    if (are_all_files_selected(dir, condensed_paths)) {
      for (const file of dir_to_children.get(dir) || []) {
        condensed_paths.delete(file)
      }

      condensed_paths.add(dir)

      for (const p of Array.from(condensed_paths)) {
        if (p !== dir && p.startsWith(dir + path.sep)) {
          condensed_paths.delete(p)
        }
      }
    }
  }

  return Array.from(condensed_paths)
}

export const add_workspace_prefix = (
  relative_paths: string[],
  workspace_root: string
): string[] => {
  const workspaceFolders = vscode.workspace.workspaceFolders || []
  const currentWorkspace = workspaceFolders.find(
    (folder) => folder.uri.fsPath === workspace_root
  )

  if (!currentWorkspace || workspaceFolders.length <= 1) {
    return relative_paths
  }

  return relative_paths.map((p) => `${currentWorkspace.name}:${p}`)
}
