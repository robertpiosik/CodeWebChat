import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_STATE_KEY,
  CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY
} from '../../../constants/state-keys'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint, CheckpointTab } from '../types'
import { get_checkpoints } from './get-checkpoints'
import {
  copy_optimised_recursively,
  get_checkpoint_path,
  get_incremented_description
} from '../utils'
import {
  get_git_diff,
  get_git_info,
  is_git_repository
} from '../utils/git-utils'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { WebsitesProvider } from '@/context/providers/websites-provider'

const remove_old_checkpoints = async (
  checkpoints: Checkpoint[]
): Promise<Checkpoint[]> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const checkpoint_lifespan_hours =
    config.get<number>('checkpointLifespan') || 48
  const checkpoint_lifespan_ms = checkpoint_lifespan_hours * 60 * 60 * 1000

  const now = Date.now()
  const cutoff_time = now - checkpoint_lifespan_ms

  const checkpoints_to_keep: Checkpoint[] = []
  const checkpoints_to_remove: Checkpoint[] = []

  for (const checkpoint of checkpoints) {
    if (checkpoint.timestamp < cutoff_time) {
      checkpoints_to_remove.push(checkpoint)
    } else {
      checkpoints_to_keep.push(checkpoint)
    }
  }

  // Delete old checkpoint files
  for (const checkpoint of checkpoints_to_remove) {
    try {
      const checkpoint_path = get_checkpoint_path(checkpoint.timestamp)
      await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
        recursive: true
      })
      Logger.info({
        function_name: 'remove_old_checkpoints',
        message: `Removed checkpoint older than 48 hours: ${checkpoint.title}`,
        data: { timestamp: checkpoint.timestamp }
      })
    } catch (error) {
      Logger.warn({
        function_name: 'remove_old_checkpoints',
        message: 'Could not delete old checkpoint file',
        data: error
      })
    }
  }

  return checkpoints_to_keep
}

export const create_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  websites_provider: WebsitesProvider,
  title: string = 'Created by user',
  description?: string
): Promise<Checkpoint | undefined> => {
  try {
    const operation_in_progress = context.workspaceState.get<number>(
      CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY
    )
    if (
      operation_in_progress &&
      Date.now() - operation_in_progress < 60 * 1000
    ) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.CHECKPOINT_OPERATION_IN_PROGRESS
      )
      return undefined
    }

    const old_temp_checkpoint = context.workspaceState.get<Checkpoint>(
      TEMPORARY_CHECKPOINT_STATE_KEY
    )
    if (old_temp_checkpoint) {
      try {
        const checkpoint_path = get_checkpoint_path(
          old_temp_checkpoint.timestamp
        )
        await vscode.workspace.fs.delete(vscode.Uri.file(checkpoint_path), {
          recursive: true
        })
      } catch (error) {
        Logger.warn({
          function_name: 'create_checkpoint',
          message: 'Could not delete old temporary checkpoint file',
          data: error
        })
      }
      await context.workspaceState.update(
        TEMPORARY_CHECKPOINT_STATE_KEY,
        undefined
      )
    }
    const timestamp = Date.now()
    const workspace_folders = vscode.workspace.workspaceFolders!

    const folder_git_statuses = await Promise.all(
      workspace_folders.map((folder) => is_git_repository(folder))
    )
    const all_folders_use_git = folder_git_statuses.every((status) => status)

    let new_checkpoint: Checkpoint | undefined

    const create_checkpoint_task = async () => {
      await context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        Date.now()
      )
      await vscode.workspace.saveAll()
      const checkpoint_dir_path = get_checkpoint_path(timestamp)
      const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
      await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

      const git_data: Record<string, any> = {}
      let uses_git = false

      for (const [index, folder] of workspace_folders.entries()) {
        const has_git = folder_git_statuses[index]

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
              function_name: 'create_checkpoint',
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

      let checkpoints = await get_checkpoints(context)

      // Remove checkpoints older than 48 hours
      checkpoints = await remove_old_checkpoints(checkpoints)

      const final_description = get_incremented_description(
        title,
        description,
        checkpoints
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

      const checkpoint_object: Checkpoint = {
        title,
        timestamp,
        description: final_description,
        uses_git,
        git_data: Object.keys(git_data).length > 0 ? git_data : undefined,
        checked_files: workspace_provider.get_all_checked_paths(),
        checked_websites: websites_provider
          .get_checked_websites()
          .map((w) => w.url),
        active_tabs
      }

      checkpoints.unshift(checkpoint_object)
      await context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
      await panel_provider.send_checkpoints()
      await context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        undefined
      )
      new_checkpoint = checkpoint_object
    }

    if (all_folders_use_git) {
      await create_checkpoint_task()
    } else {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Creating checkpoint...',
          cancellable: false
        },
        create_checkpoint_task
      )
    }
    return new_checkpoint
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create checkpoint: ${err.message}`
    )
    await context.workspaceState.update(
      CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
      undefined
    )
    return undefined
  }
}
