import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_STATE_KEY,
  CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY
} from '@/constants/state-keys'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import type { Checkpoint, CheckpointTab, CheckpointTrigger } from '../types'
import { get_checkpoints, remove_old_checkpoints } from './get-checkpoints'
import { get_checkpoint_path, get_incremented_description } from '../utils'
import { create_workspace_snapshot } from '@/utils/workspace-snapshot'
import { is_git_repository } from '@/utils/git-utils'
import { Logger } from '@shared/utils/logger'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { response_preview_promise_resolve } from '@/commands/apply-response-command/utils/preview'
import { t } from '@/i18n'
import { get_error_message } from '@/utils/get-error-message'

export const create_checkpoint = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  trigger?: CheckpointTrigger
  description?: string
  hide_notification?: boolean
}): Promise<Checkpoint | undefined> => {
  try {
    const trigger = params.trigger ?? 'manual'

    const operation_in_progress =
      params.extension_context.workspaceState.get<number>(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY
      )
    if (
      operation_in_progress &&
      Date.now() - operation_in_progress < 60 * 1000
    ) {
      vscode.window.showWarningMessage(
        t('feature.checkpoints.warning.operation-in-progress')
      )
      return undefined
    }

    const old_temp_checkpoint =
      params.extension_context.workspaceState.get<Checkpoint>(
        TEMPORARY_CHECKPOINT_STATE_KEY
      )
    if (old_temp_checkpoint) {
      try {
        const checkpoint_path = get_checkpoint_path(
          old_temp_checkpoint.timestamp,
          params.extension_context
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
      await params.extension_context.workspaceState.update(
        TEMPORARY_CHECKPOINT_STATE_KEY,
        undefined
      )
    }
    const timestamp = Date.now()
    const workspace_folders = vscode.workspace.workspaceFolders!

    const folder_git_statuses = await Promise.all(
      workspace_folders.map((folder) => is_git_repository(folder))
    )

    if (
      trigger !== 'manual' &&
      folder_git_statuses.some((has_git) => !has_git)
    ) {
      return undefined
    }

    let new_checkpoint: Checkpoint | undefined

    const create_checkpoint_task = async () => {
      await params.extension_context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        Date.now()
      )

      const checkpoint_dir_path = get_checkpoint_path(
        timestamp,
        params.extension_context
      )
      const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)
      await vscode.workspace.fs.createDirectory(checkpoint_dir_uri)

      const snapshot_data = await create_workspace_snapshot(
        checkpoint_dir_path,
        params.workspace_provider
      )

      let checkpoints = await get_checkpoints(params.extension_context)

      checkpoints = await remove_old_checkpoints(
        checkpoints,
        params.extension_context
      )

      const final_description = get_incremented_description(
        trigger,
        params.description,
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
        trigger,
        timestamp,
        description: final_description,
        uses_git: snapshot_data.uses_git,
        git_data: snapshot_data.git_data,
        selected_files: params.workspace_provider.get_all_selected_paths(),
        active_tabs,
        completed_tasks: [...params.prompt_view_provider.completed_tasks]
      }

      if (trigger === 'manual' && !response_preview_promise_resolve) {
        checkpoint_object.response_history = [
          ...params.prompt_view_provider.response_history
        ]
      }

      checkpoints.unshift(checkpoint_object)
      await params.extension_context.workspaceState.update(
        CHECKPOINTS_STATE_KEY,
        checkpoints
      )
      await params.extension_context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        undefined
      )
      new_checkpoint = checkpoint_object
    }

    if (params.hide_notification) {
      await create_checkpoint_task()
    } else {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('common.progress.creating-checkpoint'),
          cancellable: false
        },
        create_checkpoint_task
      )
    }

    return new_checkpoint
  } catch (err) {
    vscode.window.showErrorMessage(
      t('feature.checkpoints.error.create-failed', {
        error: get_error_message(err)
      })
    )
    await params.extension_context.workspaceState.update(
      CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
      undefined
    )
    return undefined
  }
}
