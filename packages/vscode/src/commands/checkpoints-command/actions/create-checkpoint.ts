import * as vscode from 'vscode'
import { CHECKPOINTS_STATE_KEY } from '../../../constants/state-keys'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import type { Checkpoint } from '../types'
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

export const create_checkpoint = async (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext,
  title: string = 'Created by user',
  description?: string
): Promise<boolean> => {
  try {
    const timestamp = Date.now()
    const workspace_folders = vscode.workspace.workspaceFolders!

    const folder_git_statuses = await Promise.all(
      workspace_folders.map((folder) => is_git_repository(folder))
    )
    const all_folders_use_git = folder_git_statuses.every((status) => status)

    const create_checkpoint_task = async () => {
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
            throw new Error(
              `Failed to get git information for repository in ${folder.name}.`
            )
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

      const checkpoints = await get_checkpoints(context)

      const final_description = get_incremented_description(
        title,
        description,
        checkpoints
      )

      const new_checkpoint: Checkpoint = {
        title,
        timestamp,
        description: final_description,
        uses_git,
        git_data: Object.keys(git_data).length > 0 ? git_data : undefined
      }

      checkpoints.unshift(new_checkpoint)
      await context.workspaceState.update(CHECKPOINTS_STATE_KEY, checkpoints)
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
    return true
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Failed to create checkpoint: ${err.message}`
    )
    return false
  }
}
