import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_STATE_KEY
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
  let activeDeleteOperation: {
    finalize: () => Promise<void>
    timestamp: number
  } | null = null

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

        let notification_count = 0
        let checkpoints: Checkpoint[] = []

        const refresh_items = async () => {
          quick_pick.busy = true
          checkpoints = await get_checkpoints(context)

          const temp_checkpoint = context.workspaceState.get<Checkpoint>(
            TEMPORARY_CHECKPOINT_STATE_KEY
          )
          let revert_item:
            | (vscode.QuickPickItem & { id?: string; checkpoint?: Checkpoint })
            | undefined

          if (temp_checkpoint) {
            const three_hours_in_ms = 3 * 60 * 60 * 1000
            if (Date.now() - temp_checkpoint.timestamp < three_hours_in_ms) {
              try {
                const checkpoint_path = get_checkpoint_path(
                  temp_checkpoint.timestamp
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
                  TEMPORARY_CHECKPOINT_STATE_KEY,
                  undefined
                )
              }
            }
          }

          const visible_checkpoints = checkpoints.filter((c) => !c.is_temporary)

          visible_checkpoints.sort((a, b) => {
            return b.timestamp - a.timestamp
          })

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
              return {
                id: c.timestamp.toString(),
                label: c.starred ? `$(star-full) ${c.title}` : c.title,
                description: dayjs(c.timestamp).fromNow(),
                detail: c.description,
                checkpoint: c,
                index,
                buttons: [
                  {
                    iconPath: new vscode.ThemeIcon(
                      c.starred ? 'star-full' : 'star-empty'
                    ),
                    tooltip: c.starred ? 'Unstar' : 'Star'
                  },
                  ...(c.title == 'Created by user'
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
                    : [])
                ]
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
            const temp_checkpoint = context.workspaceState.get<Checkpoint>(
              TEMPORARY_CHECKPOINT_STATE_KEY
            )
            if (!temp_checkpoint) {
              vscode.window.showErrorMessage(
                'Could not find temporary checkpoint to revert.'
              )
              return
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
              TEMPORARY_CHECKPOINT_STATE_KEY,
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

          if (e.button.tooltip == 'Star' || e.button.tooltip == 'Unstar') {
            const checkpoint_to_update = checkpoints.find(
              (c) => c.timestamp == item.checkpoint?.timestamp
            )
            if (checkpoint_to_update) {
              checkpoint_to_update.starred = !checkpoint_to_update.starred
              await context.workspaceState.update(
                CHECKPOINTS_STATE_KEY,
                checkpoints
              )
            }
            await refresh_items()
            const active_item = quick_pick.items.find(
              (i) =>
                (i as any).checkpoint?.timestamp === item.checkpoint?.timestamp
            )
            if (active_item) {
              quick_pick.activeItems = [active_item]
            }
            quick_pick.show()
            return
          }

          if (e.button.tooltip == 'Edit Description') {
            notification_count++
            const new_description = await vscode.window.showInputBox({
              prompt: 'Enter a description for the checkpoint',
              value: item.checkpoint.description || '',
              placeHolder: 'e.g. Before refactoring the main component'
            })
            notification_count--

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
              }
            }
            await refresh_items()
            if (new_description !== undefined) {
              const active_item = quick_pick.items.find(
                (i) =>
                  (i as any).checkpoint?.timestamp ===
                  item.checkpoint?.timestamp
              )
              if (active_item) {
                quick_pick.activeItems = [active_item]
              }
            }
            quick_pick.show()
            return
          }

          if (e.button.tooltip == 'Delete') {
            if (activeDeleteOperation) {
              await activeDeleteOperation.finalize()
            }

            const deleted_checkpoint = item.checkpoint
            const real_index_in_state = checkpoints.findIndex(
              (c) => c.timestamp == deleted_checkpoint.timestamp
            )
            if (real_index_in_state == -1) return

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

            const currentOperation = {
              timestamp: deleted_checkpoint.timestamp,
              finalize: async () => {
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
            }
            activeDeleteOperation = currentOperation

            notification_count++
            const choice = await vscode.window.showInformationMessage(
              `Checkpoint from ${dayjs(
                deleted_checkpoint.timestamp
              ).fromNow()} deleted.`,
              'Undo'
            )
            notification_count--

            if (
              activeDeleteOperation &&
              activeDeleteOperation.timestamp === currentOperation.timestamp
            ) {
              if (choice == 'Undo') {
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
                notification_count++
                vscode.window
                  .showInformationMessage('Checkpoint restored.')
                  .then(() => {
                    notification_count--
                  })
                await refresh_items()
              } else {
                await currentOperation.finalize()
              }
              activeDeleteOperation = null
            } else if (choice === 'Undo') {
              notification_count++
              vscode.window
                .showInformationMessage(
                  'Could not undo. Another checkpoint was deleted.'
                )
                .then(() => {
                  notification_count--
                })
            }

            quick_pick.show()
            return
          }
        })

        quick_pick.onDidHide(() => {
          if (notification_count > 0) {
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
