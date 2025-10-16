import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { should_ignore_file } from '../../../context/utils/should-ignore-file'

const directory_contains_ignored = async (
  dir_uri: vscode.Uri,
  root_path: string,
  workspace_provider: WorkspaceProvider
): Promise<boolean> => {
  const entries = await vscode.workspace.fs.readDirectory(dir_uri)
  for (const [name] of entries) {
    const entry_uri = vscode.Uri.joinPath(dir_uri, name)
    const relative_path = path.relative(root_path, entry_uri.fsPath)

    if (workspace_provider.is_excluded(relative_path)) {
      return true
    }

    let entry_stat: vscode.FileStat
    try {
      entry_stat = await vscode.workspace.fs.stat(entry_uri)
    } catch (e) {
      // broken symlink or other issue, consider it something that prevents wholesale copy.
      return true
    }

    if (entry_stat.type == vscode.FileType.Directory) {
      if (
        await directory_contains_ignored(
          entry_uri,
          root_path,
          workspace_provider
        )
      ) {
        return true
      }
    } else if (entry_stat.type == vscode.FileType.File) {
      if (
        should_ignore_file(
          entry_uri.fsPath,
          workspace_provider.ignored_extensions
        )
      ) {
        return true
      }
    }
  }
  return false
}

export const copy_optimised_recursively = async (
  source_uri: vscode.Uri,
  dest_uri: vscode.Uri,
  root_path: string,
  workspace_provider: WorkspaceProvider
) => {
  const relative_path = path.relative(root_path, source_uri.fsPath)
  if (relative_path && workspace_provider.is_excluded(relative_path)) {
    return
  }

  let source_stat: vscode.FileStat
  try {
    source_stat = await vscode.workspace.fs.stat(source_uri)
  } catch (e) {
    // Source may not exist (e.g. broken symlink). Just skip.
    return
  }

  if (source_stat.type == vscode.FileType.Directory) {
    if (
      !(await directory_contains_ignored(
        source_uri,
        root_path,
        workspace_provider
      ))
    ) {
      await fs.cp(source_uri.fsPath, dest_uri.fsPath, {
        recursive: true,
        force: true
      })
      return
    }

    await vscode.workspace.fs.createDirectory(dest_uri)
    const entries = await vscode.workspace.fs.readDirectory(source_uri)
    for (const [name] of entries) {
      await copy_optimised_recursively(
        vscode.Uri.joinPath(source_uri, name),
        vscode.Uri.joinPath(dest_uri, name),
        root_path,
        workspace_provider
      )
    }
  } else if (source_stat.type == vscode.FileType.File) {
    if (
      should_ignore_file(
        source_uri.fsPath,
        workspace_provider.ignored_extensions
      )
    ) {
      return
    }
    await fs.copyFile(source_uri.fsPath, dest_uri.fsPath)
  }
  // Other file types are ignored. fs.stat resolves symlinks.
}
