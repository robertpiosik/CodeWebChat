import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'

async function count_sync_operations(params: {
  source_dir: vscode.Uri
  dest_dir: vscode.Uri
  root_path: string
  workspace_provider: WorkspaceProvider
}): Promise<number> {
  let count = 0

  try {
    await vscode.workspace.fs.stat(params.dest_dir)
  } catch (e) {
    return 1 // It will be one copy operation
  }

  const dest_entries = await vscode.workspace.fs.readDirectory(params.dest_dir)
  const source_entries = await vscode.workspace.fs.readDirectory(
    params.source_dir
  )
  const source_map = new Map(source_entries)

  // Count deletions
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
      count++
    }
  }

  // Count copies
  for (const [name, type] of source_entries) {
    const source_uri = vscode.Uri.joinPath(params.source_dir, name)
    const dest_uri = vscode.Uri.joinPath(params.dest_dir, name)

    let dest_stat: vscode.FileStat | undefined
    try {
      dest_stat = await vscode.workspace.fs.stat(dest_uri)
    } catch {}

    if (type === vscode.FileType.Directory) {
      if (dest_stat?.type === vscode.FileType.Directory) {
        count += await count_sync_operations({
          ...params,
          source_dir: source_uri,
          dest_dir: dest_uri
        })
      } else {
        count++ // delete whatever is at dest, then copy dir
      }
    } else if (type === vscode.FileType.File) {
      count++ // copy file
    }
  }

  return count
}

export const sync_directory = async (params: {
  source_dir: vscode.Uri
  dest_dir: vscode.Uri
  root_path: string
  workspace_provider: WorkspaceProvider
  progress?: vscode.Progress<{ message?: string; increment?: number }>
  _increment?: number
}) => {
  let dest_entries: [string, vscode.FileType][]
  try {
    dest_entries = await vscode.workspace.fs.readDirectory(params.dest_dir)
  } catch (e) {
    await vscode.workspace.fs.copy(params.source_dir, params.dest_dir, {
      overwrite: true
    })
    if (params.progress && params._increment) {
      params.progress.report({ increment: params._increment })
    }
    return
  }

  const source_entries = await vscode.workspace.fs.readDirectory(
    params.source_dir
  )
  const source_map = new Map(source_entries)

  if (params.progress && params._increment === undefined) {
    const total_ops = await count_sync_operations(params)
    if (total_ops > 0) {
      params = { ...params, _increment: 100 / total_ops }
    } else {
      params = { ...params, _increment: 0 }
    }
  }

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
      if (params.progress && params._increment) {
        params.progress.report({ increment: params._increment })
      }
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
          dest_dir: dest_uri,
          _increment: params._increment
        })
      } else {
        if (dest_stat) {
          await vscode.workspace.fs.delete(dest_uri, {
            recursive: true
          })
        }
        await vscode.workspace.fs.copy(source_uri, dest_uri, {
          overwrite: true
        })
        if (params.progress && params._increment) {
          params.progress.report({ increment: params._increment })
        }
      }
    } else if (type == vscode.FileType.File) {
      if (dest_stat?.type == vscode.FileType.File) {
        if (source_stat.mtime != dest_stat.mtime) {
          await vscode.workspace.fs.copy(source_uri, dest_uri, {
            overwrite: true
          })
          if (params.progress && params._increment) {
            params.progress.report({ increment: params._increment })
          }
        }
      } else {
        if (dest_stat) {
          await vscode.workspace.fs.delete(dest_uri, {
            recursive: true
          })
        }
        await vscode.workspace.fs.copy(source_uri, dest_uri, {
          overwrite: true
        })
        if (params.progress && params._increment) {
          params.progress.report({ increment: params._increment })
        }
      }
    }
  }
}
