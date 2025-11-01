import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'

export const sync_directory = async (params: {
  source_dir: vscode.Uri
  dest_dir: vscode.Uri
  root_path: string
  workspace_provider: WorkspaceProvider
}) => {
  let dest_entries: [string, vscode.FileType][]
  try {
    dest_entries = await vscode.workspace.fs.readDirectory(params.dest_dir)
  } catch (e) {
    await fs.cp(params.source_dir.fsPath, params.dest_dir.fsPath, {
      recursive: true,
      force: true
    })
    return
  }

  const source_entries = await vscode.workspace.fs.readDirectory(
    params.source_dir
  )
  const source_map = new Map(source_entries)

  for (const [name] of dest_entries) {
    if (!source_map.has(name)) {
      const dest_uri = vscode.Uri.joinPath(params.dest_dir, name)
      const relative_path = path.relative(params.root_path, dest_uri.fsPath)

      if (
        params.workspace_provider.is_excluded(relative_path) ||
        params.workspace_provider.is_ignored_by_patterns(dest_uri.fsPath)
      ) {
        continue
      }

      await vscode.workspace.fs.delete(dest_uri, { recursive: true })
    }
  }

  for (const [name, type] of source_entries) {
    const source_uri = vscode.Uri.joinPath(params.source_dir, name)
    const dest_uri = vscode.Uri.joinPath(params.dest_dir, name)

    let dest_stat: vscode.FileStat | undefined
    try {
      dest_stat = await vscode.workspace.fs.stat(dest_uri)
    } catch {}

    const source_stat = await vscode.workspace.fs.stat(source_uri)

    if (type == vscode.FileType.Directory) {
      if (dest_stat?.type == vscode.FileType.Directory) {
        await sync_directory({
          ...params,
          source_dir: source_uri,
          dest_dir: dest_uri
        })
      } else {
        if (dest_stat) {
          await vscode.workspace.fs.delete(dest_uri, {
            recursive: true
          })
        }
        await fs.cp(source_uri.fsPath, dest_uri.fsPath, {
          recursive: true,
          force: true
        })
      }
    } else if (type == vscode.FileType.File) {
      if (dest_stat?.type == vscode.FileType.File) {
        if (source_stat.mtime != dest_stat.mtime) {
          await fs.copyFile(source_uri.fsPath, dest_uri.fsPath)
        }
      } else {
        if (dest_stat) {
          await vscode.workspace.fs.delete(dest_uri, {
            recursive: true
          })
        }
        await fs.copyFile(source_uri.fsPath, dest_uri.fsPath)
      }
    }
  }
}
