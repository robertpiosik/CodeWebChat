import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY
} from '../../constants/state-keys'
import { WorkspaceProvider } from '../../context/providers/workspace-provider'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Checkpoint } from './types'
import {
  create_checkpoint,
  delete_checkpoint,
  get_checkpoints,
  restore_checkpoint
} from './actions'
import { get_checkpoint_path } from './utils'

dayjs.extend(relativeTime)

export type { Checkpoint } from './types'

export const checkpoints_command = (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext
): vscode.Disposable[] => {
  const create_new_checkpoint_command = vscode.commands.registerCommand(
    'codeWebChat.createNewCheckpoint',
    async () => {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length == 0
      ) {
        vscode.window.showErrorMessage(
          'Checkpoints can only be used in a workspace.'
        )
        return
      }
      const success = await create_checkpoint(workspace_provider, context)
      if (success) {
        vscode.window.showInformationMessage('Checkpoint created successfully.')
      }
    }
  )

  const checkpoints_command = vscode.commands.registerCommand(
    'codeWebChat.checkpoints',
    async () => {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length == 0
      ) {
        vscode.window.showErrorMessage(
          'Checkpoints can only be used in a workspace.'
        )
        return
      }

      const show_quick_pick = async () => {
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { id?: string; checkpoint?: Checkpoint }
        >()
        quick_pick.placeholder =
          'Select a checkpoint to restore or add a new one'

        let is_showing_dialog = false
        let checkpoints: Checkpoint[] = []

        const refresh_items = async () => {
          quick_pick.busy = true
          checkpoints = await get_checkpoints(context)

          const temp_checkpoint_timestamp = context.workspaceState.get<number>(
            TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY
          )
          let revert_item:
            | (vscode.QuickPickItem & { id?: string; checkpoint?: Checkpoint })
            | undefined

          if (temp_checkpoint_timestamp) {
            const three_hours_in_ms = 3 * 60 * 60 * 1000
            if (Date.now() - temp_checkpoint_timestamp < three_hours_in_ms) {
              try {
                const checkpoint_path = get_checkpoint_path(
                  temp_checkpoint_timestamp
                )
                await vscode.workspace.fs.stat(vscode.Uri.file(checkpoint_path))
                revert_item = {
                  id: 'revert-last',
                  label: '$(discard) Revert last restored checkpoint',
                  alwaysShow: true
                }
              } catch {
                // file doesn't exist, so we can't revert. Clean up state.
                await context.workspaceState.update(
                  TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
                  undefined
                )
              }
            }
          }

          const visible_checkpoints = checkpoints.filter((c) => !c.is_temporary)
          const detail_counts = new Map<string, number>()
          for (const c of visible_checkpoints) {
            if (c.description) {
              detail_counts.set(
                c.description,
                (detail_counts.get(c.description) || 0) + 1
              )
            }
          }

          const current_detail_counts = new Map(detail_counts)

          quick_pick.items = [
            {
              id: 'add-new',
              label: '$(add) New checkpoint',
              alwaysShow: true
            },
            ...(revert_item ? [revert_item] : []),
            ...(visible_checkpoints.length > 0
              ? [
                  {
                    label: 'recently created',
                    kind: vscode.QuickPickItemKind.Separator
                  }
                ]
              : []),
            ...visible_checkpoints.map((c, index) => {
              let detail = c.description
              if (
                c.description &&
                (detail_counts.get(c.description) ?? 0) > 1
              ) {
                const current_count = current_detail_counts.get(c.description)!
                current_detail_counts.set(c.description, current_count - 1)
                if (current_count > 1) {
                  detail = `(${current_count - 1}) ${c.description}`
                }
              }
              return {
                id: c.timestamp.toString(),
                label: c.title,
                description: dayjs(c.timestamp).fromNow(),
                detail,
                checkpoint: c,
                index,
                buttons:
                  c.title == 'Created by user'
                    ? [
                        {
                          iconPath: new vscode.ThemeIcon('edit'),
                          tooltip: 'Edit Description'
                        },
                        {
                          iconPath: new vscode.ThemeIcon('trash'),
                          tooltip: 'Delete'
                        }
                      ]
                    : undefined
              }
            })
          ]
          quick_pick.busy = false
        }

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          if (!selected) return

          if (selected.id == 'add-new') {
            quick_pick.hide()
            await create_checkpoint(workspace_provider, context)
            await show_quick_pick()
          } else if (selected.id == 'revert-last') {
            quick_pick.hide()
            const temp_checkpoint_timestamp =
              context.workspaceState.get<number>(
                TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY
              )
            if (!temp_checkpoint_timestamp) {
              vscode.window.showErrorMessage(
                'Could not find temporary checkpoint to revert.'
              )
              return
            }

            const confirmation = await vscode.window.showWarningMessage(
              `Revert to the state before the last checkpoint was restored? Any changes since then will be lost.`,
              { modal: true },
              'Revert'
            )
            if (confirmation !== 'Revert') return

            const temp_checkpoint: Checkpoint = {
              timestamp: temp_checkpoint_timestamp,
              title: 'Temporary checkpoint for revert',
              is_temporary: true
            }

            await restore_checkpoint({
              checkpoint: temp_checkpoint,
              workspace_provider,
              context,
              options: { skip_confirmation: true }
            })
            // After reverting, delete the temp checkpoint and clear state.
            await delete_checkpoint({
              context,
              checkpoint_to_delete: temp_checkpoint
            })
            await context.workspaceState.update(
              TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
              undefined
            )
          } else if (selected.checkpoint) {
            quick_pick.hide()
            await restore_checkpoint({
              checkpoint: selected.checkpoint,
              workspace_provider,
              context
            })
          }
        })

        quick_pick.onDidTriggerItemButton(async (e) => {
          const item = e.item as vscode.QuickPickItem & {
            checkpoint?: Checkpoint
            index?: number
          }
          if (!item.checkpoint) return

          if (e.button.tooltip == 'Edit Description') {
            is_showing_dialog = true
            const new_description = await vscode.window.showInputBox({
              prompt: 'Enter a description for the checkpoint',
              value: item.checkpoint.description || '',
              placeHolder: 'e.g. Before refactoring the main component'
            })
            is_showing_dialog = false

            if (new_description !== undefined) {
              const checkpoint_to_update = checkpoints.find(
                (c) => c.timestamp === item.checkpoint?.timestamp
              )
              if (checkpoint_to_update) {
                checkpoint_to_update.description = new_description
                await context.workspaceState.update(
                  CHECKPOINTS_STATE_KEY,
                  checkpoints
                )
                await refresh_items()
                const active_item = quick_pick.items.find(
                  (i) =>
                    (i as any).checkpoint?.timestamp ===
                    item.checkpoint?.timestamp
                )
                if (active_item) {
                  quick_pick.activeItems = [active_item]
                }
              }
            }
            quick_pick.show()
            return
          }

          if (e.button.tooltip == 'Delete') {
            const deleted_checkpoint = item.checkpoint
            const real_index_in_state = checkpoints.findIndex(
              (c) => c.timestamp === deleted_checkpoint.timestamp
            )
            if (real_index_in_state === -1) return

            const original_checkpoint_from_state =
              checkpoints[real_index_in_state]

            // Optimistically remove from state and update UI
            const updated_checkpoints = checkpoints.filter(
              (c) => c.timestamp !== deleted_checkpoint.timestamp
            )
            await context.workspaceState.update(
              CHECKPOINTS_STATE_KEY,
              updated_checkpoints
            )
            checkpoints = updated_checkpoints
            await refresh_items()

            is_showing_dialog = true
            const choice = await vscode.window.showInformationMessage(
              `Checkpoint from ${dayjs(
                deleted_checkpoint.timestamp
              ).fromNow()} deleted.`,
              'Revert'
            )
            is_showing_dialog = false

            if (choice === 'Revert') {
              // Restore to state and UI
              checkpoints.splice(
                real_index_in_state,
                0,
                original_checkpoint_from_state
              )
              await context.workspaceState.update(
                CHECKPOINTS_STATE_KEY,
                checkpoints
              )
              vscode.window.showInformationMessage('Checkpoint restored.')
              await refresh_items()
            } else {
              // Permanently delete files
              try {
                const checkpoint_path = get_checkpoint_path(
                  deleted_checkpoint.timestamp
                )
                await vscode.workspace.fs.delete(
                  vscode.Uri.file(checkpoint_path),
                  { recursive: true }
                )
              } catch (error: any) {
                vscode.window.showWarningMessage(
                  `Could not delete checkpoint files: ${error.message}`
                )
              }
            }
            quick_pick.show()
            return
          }
        })

        quick_pick.onDidHide(() => {
          if (is_showing_dialog) {
            return
          }
          quick_pick.dispose()
        })
        await refresh_items()
        quick_pick.show()
      }

      await show_quick_pick()
    }
  )

  return [checkpoints_command, create_new_checkpoint_command]
}
