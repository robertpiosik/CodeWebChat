import * as vscode from 'vscode'
import { TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY } from '../../constants/state-keys'
import { WorkspaceProvider } from '../../context/providers/workspace-provider'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Checkpoint } from './types'
import {
  create_checkpoint,
  delete_checkpoint,
  edit_checkpoint,
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

        const refresh_items = async () => {
          quick_pick.busy = true
          const checkpoints = await get_checkpoints(context)

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
          quick_pick.items = [
            {
              id: 'add-new',
              label: '$(add) New checkpoint',
              alwaysShow: true
            },
            ...(revert_item ? [revert_item] : []),
            ...(visible_checkpoints.length > 0
              ? [{ label: '', kind: vscode.QuickPickItemKind.Separator }]
              : []),
            ...visible_checkpoints.map((c) => ({
              id: c.timestamp.toString(),
              label: c.title,
              description: dayjs(c.timestamp).fromNow(),
              detail: c.description,
              checkpoint: c,
              buttons: [
                {
                  iconPath: new vscode.ThemeIcon('edit'),
                  tooltip: 'Edit Description'
                },
                {
                  iconPath: new vscode.ThemeIcon('trash'),
                  tooltip: 'Delete Checkpoint'
                }
              ]
            }))
          ]
          quick_pick.busy = false
        }

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()
          if (!selected) return

          if (selected.id == 'add-new') {
            await create_checkpoint(workspace_provider, context)
            await show_quick_pick()
          } else if (selected.id == 'revert-last') {
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
              checkpoint_to_delete: temp_checkpoint,
              options: { skip_undo_prompt: true }
            })
            await context.workspaceState.update(
              TEMPORARY_CHECKPOINT_TIMESTAMP_STATE_KEY,
              undefined
            )
          } else if (selected.checkpoint) {
            await restore_checkpoint({
              checkpoint: selected.checkpoint,
              workspace_provider,
              context
            })
          }
        })

        quick_pick.onDidTriggerItemButton(async (e) => {
          if (e.item.checkpoint && e.button.tooltip == 'Edit Description') {
            quick_pick.hide()
            await edit_checkpoint({
              context,
              checkpoint_to_edit: e.item.checkpoint
            })
            await show_quick_pick()
          } else if (
            e.item.checkpoint &&
            e.button.tooltip == 'Delete Checkpoint'
          ) {
            quick_pick.hide()
            await delete_checkpoint({
              context,
              checkpoint_to_delete: e.item.checkpoint
            })
            await show_quick_pick()
          }
        })

        quick_pick.onDidHide(() => quick_pick.dispose())
        await refresh_items()
        quick_pick.show()
      }

      await show_quick_pick()
    }
  )

  return [checkpoints_command, create_new_checkpoint_command]
}
