import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint, CheckpointTab } from '../types'
import { copy_optimised_recursively, get_checkpoint_path } from '../utils'
import {
  get_git_diff,
  get_git_info,
  is_git_repository
} from '../utils/git-utils'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { WebsitesProvider } from '@/context/providers/websites-provider'

export const create_temporary_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  websites_provider: WebsitesProvider
): Promise<Checkpoint> => {
  await vscode.workspace.saveAll()
  const timestamp = Date.now()
  const checkpoint_dir_path = get_checkpoint_path(timestamp)
  const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
  await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

  const workspace_folders = vscode.workspace.workspaceFolders!
  const git_data: Record<string, any> = {}
  let uses_git = false

  for (const folder of workspace_folders) {
    const has_git = await is_git_repository(folder)

    if (has_git) {
      uses_git = true
      const git_info = await get_git_info(folder)
      const diff = await get_git_diff(folder)

      if (git_info && diff !== null) {
        const folder_name = folder.name
        git_data[folder_name] = {
          branch: git_info.branch,
          commit_hash: git_info.commit_hash,
          folder_name
        }

        const diff_file_path = path.join(
          checkpoint_dir_path,
          `${folder_name}.diff`
        )
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(diff_file_path),
          Buffer.from(diff, 'utf8')
        )
      } else {
        Logger.warn({
          function_name: 'create_temporary_checkpoint',
          message: `Failed to get git information for repository in ${folder.name}. Falling back to file copy.`
        })
        const dest_folder_path =
          workspace_folders.length > 1
            ? path.join(checkpoint_dir_path, folder.name)
            : checkpoint_dir_path
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
    } else {
      const dest_folder_path =
        workspace_folders.length > 1
          ? path.join(checkpoint_dir_path, folder.name)
          : checkpoint_dir_path
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

  const active_tabs: CheckpointTab[] = []
  const tab_groups = vscode.window.tabGroups.all
  for (const group of tab_groups) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        active_tabs.push({
          uri: (tab.input as vscode.TabInputText).uri.toString(),
          view_column: group.viewColumn,
          is_active: tab.isActive,
          is_group_active: group.isActive
        })
      }
    }
  }

  const new_checkpoint: Checkpoint = {
    timestamp,
    title: '',
    is_temporary: true,
    uses_git,
    git_data: Object.keys(git_data).length > 0 ? git_data : undefined,
    checked_files: workspace_provider.get_all_checked_paths(),
    checked_websites: websites_provider
      .get_checked_websites()
      .map((w) => w.url),
    active_tabs
  }
  return new_checkpoint
}
