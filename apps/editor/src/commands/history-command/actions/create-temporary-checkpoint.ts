import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import type { Checkpoint, CheckpointTab } from '@/features/checkpoints/types'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { create_workspace_snapshot } from '@/utils/workspace-snapshot'
import { is_git_repository } from '@/utils/git-utils'

export const create_temporary_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<Checkpoint | undefined> => {
  const workspace_folders = vscode.workspace.workspaceFolders!

  const folder_git_statuses = await Promise.all(
    workspace_folders.map((folder) => is_git_repository(folder))
  )

  if (folder_git_statuses.some((has_git) => !has_git)) {
    return undefined
  }

  const timestamp = Date.now()
  const checkpoint_dir_path = get_checkpoint_path(timestamp, extension_context)
  const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
  await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

  const snapshot_data = await create_workspace_snapshot(
    checkpoint_dir_path,
    workspace_provider
  )

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
    trigger: 'temporary',
    uses_git: snapshot_data.uses_git,
    git_data: snapshot_data.git_data,
    selected_files: workspace_provider.get_all_selected_paths(),
    active_tabs
  }
  return new_checkpoint
}
