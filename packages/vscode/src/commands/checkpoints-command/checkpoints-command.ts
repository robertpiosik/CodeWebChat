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
  clear_all_checkpoints,
  delete_checkpoint,
  get_checkpoints,
  restore_checkpoint,
  toggle_checkpoint_star,
  ActiveDeleteOperation,
  delete_checkpoint_with_undo
} from './actions'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { get_checkpoint_path } from './utils'
import { WebsitesProvider } from '@/context/providers/websites-provider'
import { dictionary } from '@shared/constants/dictionary'

dayjs.extend(relativeTime)

export type { Checkpoint } from './types'

export const checkpoints_command = (params: {
  context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
  websites_provider: WebsitesProvider
  panel_provider: PanelProvider
}): vscode.Disposable[] => {
  let active_delete_operation: ActiveDeleteOperation | null = null

  const create_new_checkpoint_command = vscode.commands.registerCommand(
    'codeWebChat.createNewCheckpoint',
    async () => {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length == 0
      ) {
        vscode.window.showErrorMessage(
          dictionary.error_message.CHECKPOINTS_ONLY_IN_WORKSPACE
        )
        return
      }
      const checkpoint = await create_checkpoint(
        params.workspace_provider,
        params.context,
        params.panel_provider,
        params.websites_provider
      )
      if (checkpoint) {
        vscode.commands.executeCommand('codeWebChat.checkpoints', {
          highlight_checkpoint: checkpoint
        })
      }
    }
  )

  const checkpoints_command = vscode.commands.registerCommand(
    'codeWebChat.checkpoints',
    async (args?: { highlight_checkpoint?: Checkpoint }) => {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length == 0
      ) {
        vscode.window.showErrorMessage(
          dictionary.error_message.CHECKPOINTS_ONLY_IN_WORKSPACE
        )
        return
      }

      const show_quick_pick = async () => {
        let checkpoint_to_highlight = args?.highlight_checkpoint
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { id?: string; checkpoint?: Checkpoint }
        >()
        quick_pick.title = 'Checkpoints'
        quick_pick.placeholder =
          'Select a checkpoint to restore or add a new one'
        quick_pick.matchOnDetail = true

        const clear_all_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: 'Delete all checkpoints'
        }

        const close_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Close'
        }

        let notification_count = 0
        let checkpoints: Checkpoint[] = []
        let temp_checkpoint_is_valid = false

        const update_view = () => {
          let revert_item:
            | (vscode.QuickPickItem & { id?: string; checkpoint?: Checkpoint })
            | undefined

          if (temp_checkpoint_is_valid) {
            revert_item = {
              id: 'revert-last',
              label: '$(discard) Revert last restored checkpoint'
            }
          }

          const visible_checkpoints = checkpoints.filter((c) => !c.is_temporary)

          quick_pick.buttons = [clear_all_button, close_button]

          visible_checkpoints.sort((a, b) => {
            return b.timestamp - a.timestamp
          })

          const checkpoint_items = [
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
                label: c.is_starred ? `$(star-full) ${c.title}` : c.title,
                description: dayjs(c.timestamp).fromNow(),
                detail: c.description,
                checkpoint: c,
                index,
                buttons: [
                  {
                    iconPath: new vscode.ThemeIcon(
                      c.is_starred ? 'star-full' : 'star-empty'
                    ),
                    tooltip: c.is_starred ? 'Unstar' : 'Star'
                  },
                  ...(c.title == 'Created by user'
                    ? [
                        {
                          iconPath: new vscode.ThemeIcon('edit'),
                          tooltip: 'Edit Description'
                        }
                      ]
                    : []),
                  {
                    iconPath: new vscode.ThemeIcon('trash'),
                    tooltip: 'Delete'
                  }
                ]
              }
            })
          ]

          if (quick_pick.value) {
            quick_pick.items = checkpoint_items
          } else {
            quick_pick.items = [
              {
                id: 'add-new',
                label: '$(add) New checkpoint...'
              },
              ...(revert_item ? [revert_item] : []),
              ...checkpoint_items
            ]
          }
        }

        const refresh_and_update_view = async () => {
          quick_pick.busy = true
          checkpoints = await get_checkpoints(params.context)

          const temp_checkpoint = params.context.workspaceState.get<Checkpoint>(
            TEMPORARY_CHECKPOINT_STATE_KEY
          )
          temp_checkpoint_is_valid = false
          if (temp_checkpoint) {
            const three_hours_in_ms = 3 * 60 * 60 * 1000
            if (Date.now() - temp_checkpoint.timestamp < three_hours_in_ms) {
              try {
                const checkpoint_path = get_checkpoint_path(
                  temp_checkpoint.timestamp
                )
                await vscode.workspace.fs.stat(vscode.Uri.file(checkpoint_path))
                temp_checkpoint_is_valid = true
              } catch {
                // file doesn't exist, so we can't revert. Clean up state.
                await params.context.workspaceState.update(
                  TEMPORARY_CHECKPOINT_STATE_KEY,
                  undefined
                )
              }
            }
          }

          update_view()
          if (checkpoint_to_highlight) {
            const item = quick_pick.items.find(
              (i) =>
                (i as any).checkpoint?.timestamp ===
                checkpoint_to_highlight?.timestamp
            )
            if (item) {
              quick_pick.activeItems = [item]
              checkpoint_to_highlight = undefined
            }
          }
          quick_pick.busy = false
        }

        quick_pick.onDidChangeValue(update_view)

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          if (!selected) return

          if (selected.id == 'add-new') {
            quick_pick.hide()
            const checkpoint = await create_checkpoint(
              params.workspace_provider,
              params.context,
              params.panel_provider,
              params.websites_provider
            )
            if (checkpoint) {
              vscode.commands.executeCommand('codeWebChat.checkpoints', {
                highlight_checkpoint: checkpoint
              })
            }
          } else if (selected.id == 'revert-last') {
            quick_pick.hide()
            const temp_checkpoint =
              params.context.workspaceState.get<Checkpoint>(
                TEMPORARY_CHECKPOINT_STATE_KEY
              )
            if (!temp_checkpoint) {
              vscode.window.showErrorMessage(
                dictionary.error_message
                  .COULD_NOT_FIND_TEMP_CHECKPOINT_TO_REVERT
              )
              return
            }

            await restore_checkpoint({
              checkpoint: temp_checkpoint,
              workspace_provider: params.workspace_provider,
              context: params.context,
              options: { skip_confirmation: true, use_native_progress: true },
              panel_provider: params.panel_provider,
              websites_provider: params.websites_provider
            })
            // After reverting, delete the temp checkpoint and clear state.
            await delete_checkpoint({
              context: params.context,
              checkpoint_to_delete: temp_checkpoint,
              panel_provider: params.panel_provider
            })
            await params.context.workspaceState.update(
              TEMPORARY_CHECKPOINT_STATE_KEY,
              undefined
            )
          } else if (selected.checkpoint) {
            quick_pick.hide()
            await restore_checkpoint({
              checkpoint: selected.checkpoint,
              workspace_provider: params.workspace_provider,
              context: params.context,
              panel_provider: params.panel_provider,
              websites_provider: params.websites_provider,
              options: { use_native_progress: true }
            })
          }
        })

        quick_pick.onDidTriggerButton(async (button) => {
          if (button === close_button) {
            quick_pick.hide()
            return
          }

          if (button === clear_all_button) {
            quick_pick.hide()

            const temp_checkpoint =
              params.context.workspaceState.get<Checkpoint>(
                TEMPORARY_CHECKPOINT_STATE_KEY
              )
            if (checkpoints.length === 0 && !temp_checkpoint) {
              vscode.window.showInformationMessage(
                dictionary.information_message.NOTHING_TO_DELETE
              )
              quick_pick.show()
              return
            }

            const confirmation = await vscode.window.showWarningMessage(
              dictionary.warning_message.CONFIRM_CLEAR_ALL_CHECKPOINTS,
              { modal: true },
              'Clear All'
            )

            if (confirmation == 'Clear All') {
              active_delete_operation = null
              await clear_all_checkpoints(params.context, params.panel_provider)
              vscode.window.showInformationMessage(
                dictionary.information_message.ALL_CHECKPOINTS_CLEARED
              )
            }
            await refresh_and_update_view()
          }
        })

        quick_pick.onDidTriggerItemButton(async (e) => {
          const item = e.item as vscode.QuickPickItem & {
            checkpoint?: Checkpoint
            index?: number
          }
          if (!item.checkpoint) return

          if (e.button.tooltip == 'Star' || e.button.tooltip == 'Unstar') {
            await toggle_checkpoint_star({
              context: params.context,
              timestamp: item.checkpoint.timestamp,
              panel_provider: params.panel_provider
            })

            await refresh_and_update_view()
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
              title: 'Description',
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
                await params.context.workspaceState.update(
                  CHECKPOINTS_STATE_KEY,
                  checkpoints
                )
                params.panel_provider.send_checkpoints()
              }
            }
            await refresh_and_update_view()
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
            const was_restored = await delete_checkpoint_with_undo({
              context: params.context,
              checkpoint: item.checkpoint,
              panel_provider: params.panel_provider,
              get_active_operation: () => active_delete_operation,
              set_active_operation: (op) => (active_delete_operation = op),
              on_did_update_checkpoints: (updated) => {
                checkpoints = updated
                update_view()
                // If restoring, we might want to highlight the restored item
                if (updated.length > checkpoints.length) {
                  // Heuristic: if count increased, likely restored
                  const restored_item = quick_pick.items.find(
                    (i) =>
                      (i as any).checkpoint?.timestamp ==
                      item.checkpoint?.timestamp
                  )
                  if (restored_item) {
                    quick_pick.activeItems = [restored_item]
                  }
                }
                quick_pick.show()
              },
              on_before_show_message: () => notification_count++,
              on_after_show_message: () => notification_count--
            })

            if (!was_restored) {
              quick_pick.dispose()
            } else {
              quick_pick.show()
            }
            return
          }
        })

        quick_pick.onDidHide(() => {
          if (notification_count > 0) {
            return
          }
          quick_pick.dispose()
        })
        await refresh_and_update_view()
        quick_pick.show()
      }

      await show_quick_pick()
    }
  )

  return [checkpoints_command, create_new_checkpoint_command]
}
