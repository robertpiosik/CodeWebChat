import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs/promises'
import { CHECKPOINTS_STATE_KEY } from '../constants/state-keys'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { should_ignore_file } from '../context/utils/should-ignore-file'

interface Checkpoint {
  timestamp: number
  title: string
  description?: string
  is_temporary?: boolean
}

const get_checkpoint_path = (timestamp: number): string => {
  const checkpoint_dir_name = `cwc-checkpoint-${timestamp}`
  return path.join(os.tmpdir(), checkpoint_dir_name)
}

const get_checkpoints = async (
  context: vscode.ExtensionContext
): Promise<Checkpoint[]> => {
  const checkpoints =
    context.workspaceState.get<Checkpoint[]>(CHECKPOINTS_STATE_KEY, []) ?? []
  const valid_checkpoints: Checkpoint[] = []
  let state_updated = false
  for (const checkpoint of checkpoints) {
    try {
      const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
      await vscode.workspace.fs.stat(vscode.Uri.file(checkpoint_path))
      if (!checkpoint.is_temporary) valid_checkpoints.push(checkpoint)
    } catch {
      state_updated = true
    }
  }

  if (state_updated) {
    await context.workspaceState.update(
      CHECKPOINTS_STATE_KEY,
      valid_checkpoints
    )
  }

  return valid_checkpoints.sort((a, b) => b.timestamp - a.timestamp)
}

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

    if (entry_stat.type === vscode.FileType.Directory) {
      if (
        await directory_contains_ignored(
          entry_uri,
          root_path,
          workspace_provider
        )
      ) {
        return true
      }
    } else if (entry_stat.type === vscode.FileType.File) {
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

const copy_optimised_recursively = async (
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

  if (source_stat.type === vscode.FileType.Directory) {
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
  } else if (source_stat.type === vscode.FileType.File) {
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

const copy_workspace_to_dir = async (
  dest_dir_uri: vscode.Uri,
  workspace_provider: WorkspaceProvider
) => {
  const workspace_folders = vscode.workspace.workspaceFolders!
  const dest_dir_path = dest_dir_uri.fsPath

  for (const folder of workspace_folders) {
    const dest_folder_path =
      workspace_folders.length > 1
        ? path.join(dest_dir_path, folder.name)
        : dest_dir_path
    const dest_folder_uri = vscode.Uri.file(dest_folder_path)
    if (workspace_folders.length > 1) {
      await vscode.workspace.fs.createDirectory(dest_folder_uri)
    }

    const entries = await vscode.workspace.fs.readDirectory(folder.uri)
    for (const [name] of entries) {
      await copy_optimised_recursively(
        vscode.Uri.joinPath(folder.uri, name),
        vscode.Uri.joinPath(dest_folder_uri, name),
        folder.uri.fsPath,
        workspace_provider
      )
    }
  }
}

const create_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext
) => {
  try {
    const timestamp = Date.now()
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Creating checkpoint...',
        cancellable: false
      },
      async () => {
        const checkpoint_dir_path = get_checkpoint_path(timestamp)
        const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
        await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

        await copy_workspace_to_dir(checkpoint_dir_uri, workspace_provider)

        const new_checkpoint: Checkpoint = {
          title: 'Created by user',
          timestamp
        }

        const checkpoints = await get_checkpoints(context)
        checkpoints.push(new_checkpoint)
        await context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
      }
    )

    vscode.window.showInformationMessage(
      `Checkpoint created at ${new Date(timestamp).toLocaleString()}.`
    )
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create checkpoint: ${err.message}`
    )
  }
}

const create_temporary_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext
): Promise<Checkpoint> => {
  const timestamp = Date.now()
  const checkpoint_dir_path = get_checkpoint_path(timestamp)
  const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
  await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

  await copy_workspace_to_dir(checkpoint_dir_uri, workspace_provider)

  const new_checkpoint: Checkpoint = {
    timestamp,
    title: '',
    is_temporary: true
  }

  return new_checkpoint
}

const sync_directory = async (params: {
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

      if (params.workspace_provider.is_excluded(relative_path)) {
        continue
      }

      let dest_stat
      try {
        dest_stat = await vscode.workspace.fs.stat(dest_uri)
      } catch (e) {
        continue
      }

      if (
        dest_stat.type !== vscode.FileType.Directory &&
        should_ignore_file(
          dest_uri.fsPath,
          params.workspace_provider.ignored_extensions
        )
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
    } catch {
      // does not exist
    }

    const source_stat = await vscode.workspace.fs.stat(source_uri)

    if (type === vscode.FileType.Directory) {
      if (dest_stat?.type === vscode.FileType.Directory) {
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
    } else if (type === vscode.FileType.File) {
      if (dest_stat?.type === vscode.FileType.File) {
        if (source_stat.mtime !== dest_stat.mtime) {
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

const clean_directory = async (params: {
  dir_uri: vscode.Uri
  root_path: string
  workspace_provider: WorkspaceProvider
}) => {
  const entries = await vscode.workspace.fs.readDirectory(params.dir_uri)
  for (const [name, type] of entries) {
    const entry_uri = vscode.Uri.joinPath(params.dir_uri, name)
    const relative_path = path.relative(params.root_path, entry_uri.fsPath)

    if (params.workspace_provider.is_excluded(relative_path)) {
      continue
    }

    if (
      type != vscode.FileType.Directory &&
      should_ignore_file(
        entry_uri.fsPath,
        params.workspace_provider.ignored_extensions
      )
    ) {
      continue
    }

    if (type === vscode.FileType.Directory) {
      await clean_directory({ ...params, dir_uri: entry_uri })
      try {
        // After cleaning, try to delete if empty. This will fail if it contains ignored files.
        const remaining = await vscode.workspace.fs.readDirectory(entry_uri)
        if (remaining.length === 0) {
          await vscode.workspace.fs.delete(entry_uri, {
            recursive: false
          })
        }
      } catch (e) {
        /* ignore */
      }
    } else {
      await vscode.workspace.fs.delete(entry_uri, { recursive: false })
    }
  }
}

const sync_workspace_from_dir = async (params: {
  source_dir_uri: vscode.Uri
  workspace_provider: WorkspaceProvider
}) => {
  const workspace_folders = vscode.workspace.workspaceFolders!

  if (workspace_folders.length > 1) {
    const source_entries = await vscode.workspace.fs.readDirectory(
      params.source_dir_uri
    )
    const source_folders = new Map(source_entries)
    for (const folder of workspace_folders) {
      const source_folder_type = source_folders.get(folder.name)
      if (source_folder_type === vscode.FileType.Directory) {
        const source_folder_uri = vscode.Uri.joinPath(
          params.source_dir_uri,
          folder.name
        )
        await sync_directory({
          source_dir: source_folder_uri,
          dest_dir: folder.uri,
          root_path: folder.uri.fsPath,
          workspace_provider: params.workspace_provider
        })
      } else {
        await clean_directory({
          dir_uri: folder.uri,
          root_path: folder.uri.fsPath,
          workspace_provider: params.workspace_provider
        })
      }
    }
  } else {
    await sync_directory({
      source_dir: params.source_dir_uri,
      dest_dir: workspace_folders[0].uri,
      root_path: workspace_folders[0].uri.fsPath,
      workspace_provider: params.workspace_provider
    })
  }
}

const restore_checkpoint = async (params: {
  checkpoint: Checkpoint
  workspace_provider: WorkspaceProvider
  context: vscode.ExtensionContext
  options?: { skip_confirmation?: boolean }
}) => {
  if (!params.options?.skip_confirmation) {
    const confirmation = await vscode.window.showWarningMessage(
      `This will replace all contents of your current workspace with the checkpoint from ${new Date(
        params.checkpoint.timestamp
      ).toLocaleString()}.`,
      { modal: true },
      'Restore'
    )
    if (confirmation !== 'Restore') return
  }

  let temp_checkpoint: Checkpoint | undefined
  try {
    if (!params.options?.skip_confirmation) {
      temp_checkpoint = await create_temporary_checkpoint(
        params.workspace_provider,
        params.context
      )
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create temporary checkpoint for revert: ${err.message}`
    )
    return // Don't proceed
  }

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Restoring checkpoint...',
        cancellable: false
      },
      async () => {
        const checkpoint_dir_path = get_checkpoint_path(
          params.checkpoint.timestamp
        )
        const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
        await sync_workspace_from_dir({
          source_dir_uri: checkpoint_dir_uri,
          workspace_provider: params.workspace_provider
        })
      }
    )

    const message = params.options?.skip_confirmation
      ? 'Successfully reverted changes.'
      : `Checkpoint from ${new Date(
          params.checkpoint.timestamp
        ).toLocaleString()} restored successfully.`

    if (temp_checkpoint) {
      const action = await vscode.window.showInformationMessage(
        message,
        'Revert'
      )
      if (action === 'Revert') {
        await restore_checkpoint({
          checkpoint: temp_checkpoint,
          workspace_provider: params.workspace_provider,
          context: params.context,
          options: { skip_confirmation: true }
        })
        await delete_checkpoint({
          context: params.context,
          checkpoint_to_delete: temp_checkpoint,
          options: { is_reverting: true }
        })
      } else {
        await delete_checkpoint({
          context: params.context,
          checkpoint_to_delete: temp_checkpoint,
          options: { is_reverting: true }
        })
      }
    } else {
      vscode.window.showInformationMessage(message)
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to restore checkpoint: ${err.message}`
    )
    if (temp_checkpoint) {
      await delete_checkpoint({
        context: params.context,
        checkpoint_to_delete: temp_checkpoint,
        options: { is_reverting: true }
      })
    }
  }
}

const delete_checkpoint = async (params: {
  context: vscode.ExtensionContext
  checkpoint_to_delete: Checkpoint
  options?: { is_reverting?: boolean }
}) => {
  if (!params.options?.is_reverting) {
    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete the checkpoint from ${new Date(
        params.checkpoint_to_delete.timestamp
      ).toLocaleString()}? This action cannot be undone.`,
      { modal: true },
      'Delete'
    )

    if (confirmation !== 'Delete') return
  }

  try {
    const checkpoint_path = get_checkpoint_path(
      params.checkpoint_to_delete.timestamp
    )
    await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
      recursive: true
    })
  } catch (error) {
    console.warn(`Could not delete checkpoint file: ${error}`)
  }

  const checkpoints =
    params.context.workspaceState.get<Checkpoint[]>(
      CHECKPOINTS_STATE_KEY,
      []
    ) ?? []
  const updated_checkpoints = checkpoints.filter(
    (c) => c.timestamp != params.checkpoint_to_delete.timestamp
  )
  await params.context.workspaceState.update(
    CHECKPOINTS_STATE_KEY,
    updated_checkpoints
  )

  if (!params.options?.is_reverting) {
    vscode.window.showInformationMessage(
      `Checkpoint from ${new Date(
        params.checkpoint_to_delete.timestamp
      ).toLocaleString()} deleted successfully.`
    )
  }
}

export const checkpoints_command = (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkpoints',
    async () => {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        vscode.window.showErrorMessage(
          'Checkpoints can only be used in a workspace.'
        )
        return
      }

      const show_quick_pick = async () => {
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { id: string; checkpoint?: Checkpoint }
        >()
        quick_pick.placeholder =
          'Select a checkpoint to restore or add a new one'

        const refresh_items = async () => {
          quick_pick.busy = true
          const checkpoints = await get_checkpoints(context)
          quick_pick.items = [
            {
              id: 'add-new',
              label: '$(add) Add new',
              alwaysShow: true
            },
            ...checkpoints
              .filter((c) => !c.is_temporary)
              .map((c) => ({
                id: String(c.timestamp),
                label: `Checkpoint @ ${new Date(c.timestamp).toLocaleString()}`,
                checkpoint: c,
                buttons: [
                  {
                    iconPath: new vscode.ThemeIcon('trash'),
                    tooltip: 'Delete Checkpoint'
                  }
                ]
              }))
          ]
          quick_pick.busy = false
        }

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()
          if (!selected) return

          if (selected.id == 'add-new') {
            await create_checkpoint(workspace_provider, context)
          } else if (selected.checkpoint) {
            await restore_checkpoint({
              checkpoint: selected.checkpoint,
              workspace_provider,
              context
            })
          }
        })

        quick_pick.onDidTriggerItemButton(async (e) => {
          if (e.item.checkpoint && e.button.tooltip == 'Delete Checkpoint') {
            quick_pick.hide()
            await delete_checkpoint({
              context,
              checkpoint_to_delete: e.item.checkpoint
            })
            await show_quick_pick()
          }
        })

        quick_pick.onDidHide(() => quick_pick.dispose())
        await refresh_items()
        quick_pick.show()
      }

      await show_quick_pick()
    }
  )
}
