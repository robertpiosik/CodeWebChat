import * as vscode from 'vscode'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import {
  TEMPORARY_CHECKPOINT_STATE_KEY,
  CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
  CONTEXT_CHECKED_PATHS_STATE_KEY
} from '@/constants/state-keys'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import type { Checkpoint } from '@/features/checkpoints/types'
import {
  create_checkpoint,
  delete_checkpoint,
  get_checkpoints
} from '@/features/checkpoints/actions'
import { create_temporary_checkpoint } from './create-temporary-checkpoint'
import { sync_workspace_from_dir } from './sync-workspace-from-dir'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { sync_directory } from '../utils/sync-directory'
import { Logger } from '@shared/utils/logger'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { response_preview_promise_resolve } from '@/commands/apply-response-command/utils/preview'
import { ongoing_preview_cleanup_promise } from '@/commands/apply-response-command/utils/preview-handler'
import { get_git_info } from '@/features/checkpoints/utils/git-utils'
import { CommitMessageDetails } from '@/utils/commit-message-details'
import { t } from '@/i18n'
export const restore_checkpoint = async (params: {
  checkpoint: Checkpoint
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  options?: {
    skip_confirmation?: boolean
  }
}) => {
  const operation_in_progress =
    params.extension_context.workspaceState.get<number>(
      CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY
    )
  if (operation_in_progress && Date.now() - operation_in_progress < 60 * 1000) {
    vscode.window.showWarningMessage(
      t('feature.checkpoints.warning.operation-in-progress')
    )
    return
  }

  const title = params.options?.skip_confirmation
    ? t('command.history.progress.reverting')
    : t('command.history.progress.restoring')

  const main_task = async (
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ) => {
    params.workspace_provider.pause_file_watcher()
    try {
      if (
        params.checkpoint.trigger == 'response-accepted' &&
        params.checkpoint.description
      ) {
      CommitMessageDetails.remove({
        extension_context: params.extension_context,
        prompt: params.checkpoint.description
      })
    }

    let open_files: {
      uri: vscode.Uri
      viewColumn: vscode.ViewColumn
      isActive: boolean
    }[] = []

    if (params.checkpoint.active_tabs) {
      open_files = params.checkpoint.active_tabs.map((tab) => ({
        uri: vscode.Uri.parse(tab.uri),
        viewColumn: tab.view_column as vscode.ViewColumn,
        isActive: tab.is_active && tab.is_group_active
      }))
    } else {
      const tab_groups = vscode.window.tabGroups.all
      for (const group of tab_groups) {
        for (const tab of group.tabs) {
          if (tab.input instanceof vscode.TabInputText) {
            open_files.push({
              uri: (tab.input as vscode.TabInputText).uri,
              viewColumn: group.viewColumn,
              isActive: tab.isActive && group.isActive
            })
          }
        }
      }
    }

    let temp_checkpoint: Checkpoint | undefined
    try {
      if (response_preview_promise_resolve) {
        response_preview_promise_resolve({ accepted_files: [] })
        if (ongoing_preview_cleanup_promise) {
          await ongoing_preview_cleanup_promise
        }
      }

      if (!params.options?.skip_confirmation) {
        const checkpoints = await get_checkpoints(params.extension_context)
        if (
          checkpoints.length > 0 &&
          checkpoints[0].trigger != 'before-checkpoint-restored'
        ) {
          await create_checkpoint({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            prompt_view_provider: params.prompt_view_provider,
            trigger: 'before-checkpoint-restored'
          })
        }

        const old_temp_checkpoint =
          params.extension_context.workspaceState.get<Checkpoint>(
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
              function_name: 'restore_checkpoint',
              message: 'Could not delete old temporary checkpoint file',
              data: error
            })
          }
        }

        temp_checkpoint = await create_temporary_checkpoint(
          params.workspace_provider
        )
        await params.extension_context.workspaceState.update(
          TEMPORARY_CHECKPOINT_STATE_KEY,
          temp_checkpoint
        )
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(
        t('command.history.error.create-temp-failed', {
          error: err.message
        })
      )
      await params.extension_context.workspaceState.update(
        TEMPORARY_CHECKPOINT_STATE_KEY,
        undefined
      )
      return
    }

    try {
      await params.extension_context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        Date.now()
      )
      const checkpoint_dir_path = get_checkpoint_path(
        params.checkpoint.timestamp
      )
      const checkpoint_dir_uri = vscode.Uri.file(checkpoint_dir_path)

      if (params.checkpoint.uses_git && params.checkpoint.git_data) {
        const workspace_folders = vscode.workspace.workspaceFolders!

        for (const folder of workspace_folders) {
          const folder_name = folder.name
          const git_info = params.checkpoint.git_data[folder_name]

          if (git_info) {
            const current_git_info = await get_git_info(folder)
            if (
              current_git_info &&
              current_git_info.commit_hash == git_info.commit_hash
            ) {
              try {
                execSync(`git restore .`, {
                  cwd: folder.uri.fsPath,
                  stdio: 'pipe'
                })
                execSync(`git clean -fd`, {
                  cwd: folder.uri.fsPath,
                  stdio: 'pipe'
                })
              } catch (error) {
                Logger.warn({
                  function_name: 'restore_checkpoint',
                  message: `git restore/clean failed for ${folder.name}, falling back to checkout`,
                  data: error
                })
                try {
                  execSync(`git checkout .`, {
                    cwd: folder.uri.fsPath,
                    stdio: 'pipe'
                  })
                  execSync(`git clean -fd`, {
                    cwd: folder.uri.fsPath,
                    stdio: 'pipe'
                  })
                } catch (e) {
                  Logger.error({
                    function_name: 'restore_checkpoint',
                    message: `Failed to reject changes for ${folder.name}`,
                    data: e
                  })
                  throw new Error(
                    t('command.history.error.reject-changes-failed', {
                      folder: folder.name
                    })
                  )
                }
              }

              const diff_file_path = path.join(
                checkpoint_dir_path,
                `${folder_name}.diff`
              )

              let diff = ''
              try {
                const diff_content = await vscode.workspace.fs.readFile(
                  vscode.Uri.file(diff_file_path)
                )
                diff = Buffer.from(diff_content).toString('utf8')
              } catch (e) {}

              if (diff.trim().length > 0) {
                const temp_diff_path = path.join(
                  os.tmpdir(),
                  `cwc-diff-${Date.now()}-${Math.random()
                    .toString()
                    .slice(2)}.diff`
                )

                await vscode.workspace.fs.writeFile(
                  vscode.Uri.file(temp_diff_path),
                  Buffer.from(diff, 'utf8')
                )
                try {
                  execSync(
                    `git apply --whitespace=nowarn "${temp_diff_path}"`,
                    {
                      cwd: folder.uri.fsPath,
                      stdio: 'pipe'
                    }
                  )
                } catch (e) {
                  try {
                    execSync(
                      `git apply --reject --whitespace=nowarn "${temp_diff_path}"`,
                      {
                        cwd: folder.uri.fsPath,
                        stdio: 'pipe'
                      }
                    )
                    vscode.window.showWarningMessage(
                      t('command.history.warning.diff-apply-issues', {
                        folder: folder.name
                      })
                    )
                  } catch (reject_error) {
                    Logger.error({
                      function_name: 'restore_checkpoint',
                      message: `Failed to apply git diff even with --reject for ${folder.name}`,
                      data: reject_error
                    })
                    throw new Error(
                      t('command.history.error.diff-apply-failed', {
                        folder: folder.name
                      })
                    )
                  }
                } finally {
                  try {
                    await vscode.workspace.fs.delete(
                      vscode.Uri.file(temp_diff_path)
                    )
                  } catch {}
                }
              }
              continue
            }

            const temp_git_clone_path = path.join(
              os.tmpdir(),
              `cwc-git-clone-${Date.now()}-${Math.random().toString().slice(2)}`
            )
            const temp_git_dir_uri = vscode.Uri.file(temp_git_clone_path)

            try {
              await vscode.workspace.fs.createDirectory(temp_git_dir_uri)
              execSync(`git clone "${folder.uri.fsPath}" .`, {
                cwd: temp_git_clone_path,
                stdio: 'pipe'
              })

              execSync(`git checkout ${git_info.commit_hash}`, {
                cwd: temp_git_clone_path,
                stdio: 'pipe'
              })

              await vscode.workspace.fs.delete(
                vscode.Uri.file(path.join(temp_git_clone_path, '.git')),
                { recursive: true }
              )

              const diff_file_path = path.join(
                checkpoint_dir_path,
                `${folder_name}.diff`
              )

              let diff = ''
              try {
                const diff_content = await vscode.workspace.fs.readFile(
                  vscode.Uri.file(diff_file_path)
                )
                diff = Buffer.from(diff_content).toString('utf8')
              } catch (e) {}

              if (diff.trim().length > 0) {
                const temp_diff_path = path.join(
                  temp_git_clone_path,
                  'cwc.diff'
                )
                await vscode.workspace.fs.writeFile(
                  vscode.Uri.file(temp_diff_path),
                  Buffer.from(diff, 'utf8')
                )
                try {
                  execSync(
                    `git apply --whitespace=nowarn "${temp_diff_path}"`,
                    {
                      cwd: temp_git_clone_path,
                      stdio: 'pipe'
                    }
                  )
                } catch (e) {
                  try {
                    execSync(
                      `git apply --reject --whitespace=nowarn "${temp_diff_path}"`,
                      {
                        cwd: temp_git_clone_path,
                        stdio: 'pipe'
                      }
                    )
                    vscode.window.showWarningMessage(
                      t('command.history.warning.diff-apply-issues', {
                        folder: folder.name
                      })
                    )
                  } catch (reject_error) {
                    Logger.error({
                      function_name: 'restore_checkpoint',
                      message: `Failed to apply git diff even with --reject for ${folder.name}`,
                      data: reject_error
                    })
                    throw new Error(
                      t('command.history.error.diff-apply-failed', {
                        folder: folder.name
                      })
                    )
                  }
                } finally {
                  try {
                    await vscode.workspace.fs.delete(
                      vscode.Uri.file(temp_diff_path)
                    )
                  } catch {}
                }
              }

              await sync_directory({
                source_dir: temp_git_dir_uri,
                dest_dir: folder.uri,
                root_path: folder.uri.fsPath,
                workspace_provider: params.workspace_provider,
                progress
              })
            } catch (err) {
              Logger.error({
                function_name: 'restore_checkpoint',
                message: `Error restoring git checkpoint for ${folder.name}`,
                data: err
              })
              throw err
            } finally {
              if (temp_git_dir_uri) {
                try {
                  await vscode.workspace.fs.delete(temp_git_dir_uri, {
                    recursive: true
                  })
                } catch {}
              }
            }
          } else {
            const source_folder_uri =
              workspace_folders.length > 1
                ? vscode.Uri.joinPath(checkpoint_dir_uri, folder.name)
                : checkpoint_dir_uri
            try {
              await vscode.workspace.fs.stat(source_folder_uri)
              await sync_directory({
                source_dir: source_folder_uri,
                dest_dir: folder.uri,
                root_path: folder.uri.fsPath,
                workspace_provider: params.workspace_provider,
                progress
              })
            } catch {}
          }
        }
      } else {
        await sync_workspace_from_dir({
          source_dir_uri: checkpoint_dir_uri,
          workspace_provider: params.workspace_provider,
          progress
        })
      }

      if (params.checkpoint.response_history) {
        params.prompt_view_provider.response_history =
          params.checkpoint.response_history
        params.prompt_view_provider.send_message({
          command: 'RESPONSE_HISTORY',
          history: params.checkpoint.response_history
        })
      } else {
        params.prompt_view_provider.response_history = []
        params.prompt_view_provider.send_message({
          command: 'RESPONSE_HISTORY',
          history: []
        })
      }

      const active_file = open_files.find((f) => f.isActive)

      for (const file of open_files) {
        if (active_file && file === active_file) {
          continue
        }
        try {
          await vscode.workspace.fs.stat(file.uri)
          const doc = await vscode.workspace.openTextDocument(file.uri)
          await vscode.window.showTextDocument(doc, {
            viewColumn: file.viewColumn,
            preserveFocus: true,
            preview: false
          })
        } catch {}
      }

      if (active_file) {
        try {
          await vscode.workspace.fs.stat(active_file.uri)
          const doc = await vscode.workspace.openTextDocument(active_file.uri)
          await vscode.window.showTextDocument(doc, {
            viewColumn: active_file.viewColumn,
            preserveFocus: false,
            preview: false
          })
        } catch {}
      }

      if (params.checkpoint.checked_files) {
        await params.extension_context.workspaceState.update(
          CONTEXT_CHECKED_PATHS_STATE_KEY,
          params.checkpoint.checked_files
        )
        params.workspace_provider.load_checked_files_state()
      }

      await params.extension_context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        undefined
      )

      if (
        params.checkpoint.trigger == 'response-accepted' &&
        params.checkpoint.response_preview_item_created_at &&
        params.checkpoint.response_history
      ) {
        const item_to_preview = params.checkpoint.response_history.find(
          (item) =>
            item.created_at ==
            params.checkpoint.response_preview_item_created_at
        )
        if (item_to_preview) {
          vscode.commands.executeCommand('codeWebChat.applyResponse', {
            response: item_to_preview.response,
            raw_instructions: item_to_preview.raw_instructions,
            files_with_content: item_to_preview.files,
            created_at: item_to_preview.created_at,
            url: item_to_preview.url,
            recent_api_configuration: item_to_preview.recent_api_configuration
          })
        }
      }
    } catch (err: any) {
      await params.extension_context.workspaceState.update(
        CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY,
        undefined
      )
      vscode.window.showErrorMessage(
        t('command.history.error.restore-failed', { error: err.message })
      )
      if (temp_checkpoint) {
        await delete_checkpoint({
          extension_context: params.extension_context,
          checkpoint_to_delete: temp_checkpoint,
          prompt_view_provider: params.prompt_view_provider
        })
        await params.extension_context.workspaceState.update(
          TEMPORARY_CHECKPOINT_STATE_KEY,
          undefined
        )
      }
      throw err
    }

    return temp_checkpoint
    } finally {
      params.workspace_provider.resume_file_watcher()
      params.workspace_provider.refresh()
    }
  }

  let temp_check: Checkpoint | undefined
  try {
    temp_check = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      main_task
    )
  } catch (e) {
    return
  }

  const message = params.options?.skip_confirmation
    ? t('command.history.success.reverted')
    : t('command.history.success.restored')

  if (temp_check) {
    const action_label = t('command.history.action.revert')
    const action = await vscode.window.showInformationMessage(
      message,
      action_label
    )
    if (action == action_label) {
      await restore_checkpoint({
        checkpoint: temp_check,
        workspace_provider: params.workspace_provider,
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
        options: { skip_confirmation: true }
      })
      await params.extension_context.workspaceState.update(
        TEMPORARY_CHECKPOINT_STATE_KEY,
        undefined
      )
      await delete_checkpoint({
        extension_context: params.extension_context,
        checkpoint_to_delete: temp_check,
        prompt_view_provider: params.prompt_view_provider
      })
    }
  } else {
    vscode.window.showInformationMessage(message)
  }
}
