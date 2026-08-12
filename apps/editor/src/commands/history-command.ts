import * as vscode from 'vscode'
import {
  CHECKPOINTS_STATE_KEY,
  TEMPORARY_CHECKPOINT_STATE_KEY
} from '../constants/state-keys'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { t } from '@/i18n'
import type { Checkpoint } from '@/features/checkpoints/types'
import {
  create_checkpoint,
  clear_all_checkpoints,
  delete_checkpoint,
  get_checkpoints,
  restore_checkpoint,
  toggle_checkpoint_star,
  ActiveDeleteOperation,
  delete_checkpoint_with_undo
} from '@/features/checkpoints/actions'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { get_checkpoint_path } from '@/features/checkpoints/utils'
import { get_response_preview_promise_resolve } from '@/commands/apply-response-command/utils/preview'

dayjs.extend(localizedFormat)

export type { Checkpoint } from '@/features/checkpoints/types'

export const history_command = (params: {
  extension_context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
  prompt_view_provider: PromptViewProvider
}): vscode.Disposable[] => {
  let active_delete_operation: ActiveDeleteOperation | null = null

  const create_new_checkpoint_command = vscode.commands.registerCommand(
    'codeWebChat.createNewCheckpoint',
    async () => {
      if (get_response_preview_promise_resolve()) {
        vscode.window.showWarningMessage(
          t('command.history.disabled-during-preview')
        )
        return
      }

      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length == 0
      ) {
        vscode.window.showErrorMessage(
          t('command.history.error.checkpoints-only-in-workspace')
        )
        return
      }
      const checkpoint = await create_checkpoint({
        workspace_provider: params.workspace_provider,
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider
      })
      if (checkpoint) {
        vscode.commands.executeCommand('codeWebChat.history', {
          highlight_checkpoint: checkpoint
        })
      }
    }
  )

  const history_cmd = vscode.commands.registerCommand(
    'codeWebChat.history',
    async (args?: { highlight_checkpoint?: Checkpoint }) => {
      if (get_response_preview_promise_resolve()) {
        vscode.window.showWarningMessage(
          t('command.history.disabled-during-preview')
        )
        return
      }

      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length == 0
      ) {
        vscode.window.showErrorMessage(
          t('command.history.error.checkpoints-only-in-workspace')
        )
        return
      }

      const show_quick_pick = async () => {
        let checkpoint_to_highlight = args?.highlight_checkpoint
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { id?: string; checkpoint?: Checkpoint }
        >()
        quick_pick.title = t('command.history.title')
        quick_pick.placeholder = t('command.history.placeholder')
        quick_pick.matchOnDetail = true

        const clear_all_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('trash'),
          tooltip: t('command.history.clear-history')
        }

        const close_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
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
              label: `$(discard) ${t('command.history.revert-last')}`
            }
          }

          const visible_checkpoints = checkpoints.filter(
            (c) => c.trigger != 'temporary'
          )

          if (visible_checkpoints.length > 0 || temp_checkpoint_is_valid) {
            quick_pick.buttons = [clear_all_button, close_button]
          } else {
            quick_pick.buttons = [close_button]
          }

          visible_checkpoints.sort((a, b) => {
            return b.timestamp - a.timestamp
          })

          const checkpoint_items = [
            ...(visible_checkpoints.length > 0
              ? [
                  {
                    label: t('command.history.separator.recent-checkpoints'),
                    kind: vscode.QuickPickItemKind.Separator
                  }
                ]
              : []),
            ...visible_checkpoints.map((c, index) => {
              const labelText = t(`command.history.trigger.${c.trigger}` as any)
              return {
                id: c.timestamp.toString(),
                label: c.is_starred ? `$(star-full) ${labelText}` : labelText,
                description: dayjs(c.timestamp).format('LT'),
                detail: c.description,
                checkpoint: c,
                index,
                buttons: [
                  {
                    iconPath: new vscode.ThemeIcon(
                      c.is_starred ? 'star-full' : 'star-empty'
                    ),
                    tooltip: c.is_starred
                      ? t('common.unstar')
                      : t('common.star')
                  },
                  ...(c.trigger == 'manual'
                    ? [
                        {
                          iconPath: new vscode.ThemeIcon('edit'),
                          tooltip: t('command.history.edit-description')
                        }
                      ]
                    : []),
                  {
                    iconPath: new vscode.ThemeIcon('trash'),
                    tooltip: t('common.delete')
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
                label: `$(add) ${t('command.history.new')}`
              },
              ...(revert_item ? [revert_item] : []),
              ...checkpoint_items
            ]
          }
        }

        const refresh_and_update_view = async () => {
          quick_pick.busy = true
          checkpoints = await get_checkpoints(params.extension_context)

          const temp_checkpoint =
            params.extension_context.workspaceState.get<Checkpoint>(
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
                await params.extension_context.workspaceState.update(
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
            const checkpoint = await create_checkpoint({
              workspace_provider: params.workspace_provider,
              extension_context: params.extension_context,
              prompt_view_provider: params.prompt_view_provider
            })
            if (checkpoint) {
              vscode.commands.executeCommand('codeWebChat.history', {
                highlight_checkpoint: checkpoint
              })
            }
          } else if (selected.id == 'revert-last') {
            quick_pick.hide()
            const temp_checkpoint =
              params.extension_context.workspaceState.get<Checkpoint>(
                TEMPORARY_CHECKPOINT_STATE_KEY
              )
            if (!temp_checkpoint) {
              vscode.window.showErrorMessage(
                t('command.history.error.could-not-find-temp-checkpoint')
              )
              return
            }

            await restore_checkpoint({
              checkpoint: temp_checkpoint,
              workspace_provider: params.workspace_provider,
              extension_context: params.extension_context,
              options: { skip_confirmation: true },
              prompt_view_provider: params.prompt_view_provider
            })
            // After reverting, delete the temp checkpoint and clear state.
            await params.extension_context.workspaceState.update(
              TEMPORARY_CHECKPOINT_STATE_KEY,
              undefined
            )
            await delete_checkpoint({
              extension_context: params.extension_context,
              checkpoint_to_delete: temp_checkpoint,
              prompt_view_provider: params.prompt_view_provider
            })
          } else if (selected.checkpoint) {
            quick_pick.hide()
            await restore_checkpoint({
              checkpoint: selected.checkpoint,
              workspace_provider: params.workspace_provider,
              extension_context: params.extension_context,
              prompt_view_provider: params.prompt_view_provider
            })
          }
        })

        quick_pick.onDidTriggerButton(async (button) => {
          if (button === close_button) {
            quick_pick.hide()
            return
          }

          if (button === clear_all_button) {
            notification_count++
            quick_pick.hide()

            const temp_checkpoint =
              params.extension_context.workspaceState.get<Checkpoint>(
                TEMPORARY_CHECKPOINT_STATE_KEY
              )
            if (checkpoints.length == 0 && !temp_checkpoint) {
              vscode.window.showInformationMessage(
                t('command.history.info.nothing-to-delete')
              )
              notification_count--
              quick_pick.show()
              return
            }

            const confirmation = await vscode.window.showWarningMessage(
              t('command.history.warning.confirm-clear-all'),
              { modal: true },
              t('command.history.clear-all-button')
            )

            if (confirmation == t('command.history.clear-all-button')) {
              active_delete_operation = null
              await clear_all_checkpoints(params.extension_context)
              vscode.window.showInformationMessage(
                t('command.history.info.all-cleared')
              )
            }
            await refresh_and_update_view()
            notification_count--
            quick_pick.show()
          }
        })

        quick_pick.onDidTriggerItemButton(async (e) => {
          const item = e.item as vscode.QuickPickItem & {
            checkpoint?: Checkpoint
            index?: number
          }
          if (!item.checkpoint) return

          if (
            e.button.tooltip == t('common.star') ||
            e.button.tooltip == t('common.unstar')
          ) {
            await toggle_checkpoint_star({
              extension_context: params.extension_context,
              timestamp: item.checkpoint.timestamp,
              prompt_view_provider: params.prompt_view_provider
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

          if (e.button.tooltip == t('command.history.edit-description')) {
            notification_count++
            const new_description = await vscode.window.showInputBox({
              title: t('command.history.description.title'),
              prompt: t('command.history.description.prompt'),
              value: item.checkpoint.description || '',
              placeHolder: t('command.history.description.placeholder')
            })
            notification_count--

            if (new_description !== undefined) {
              const checkpoint_to_update = checkpoints.find(
                (c) => c.timestamp === item.checkpoint?.timestamp
              )
              if (checkpoint_to_update) {
                checkpoint_to_update.description = new_description
                await params.extension_context.workspaceState.update(
                  CHECKPOINTS_STATE_KEY,
                  checkpoints
                )
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

          if (e.button.tooltip == t('common.delete')) {
            const was_restored = await delete_checkpoint_with_undo({
              extension_context: params.extension_context,
              checkpoint: item.checkpoint,
              prompt_view_provider: params.prompt_view_provider,
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

  return [history_cmd, create_new_checkpoint_command]
}
