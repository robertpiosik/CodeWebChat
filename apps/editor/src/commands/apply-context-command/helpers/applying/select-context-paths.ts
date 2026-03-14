import * as vscode from 'vscode'
import * as path from 'path'
import { SavedContext } from '@/types/context'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { resolve_context_paths } from './resolve-context-paths'
import { display_token_count } from '../../../../utils/display-token-count'
import { t } from '@/i18n'

let active_deletion_timestamp: number | undefined

export const select_context_paths = async (
  context: SavedContext,
  workspace_provider: WorkspaceProvider,
  update_context_paths?: (remaining_files: string[]) => Promise<void>
): Promise<'back' | void> => {
  const primary_workspace_root = workspace_provider.get_workspace_roots()[0]!
  let resolved_paths = await resolve_context_paths(
    context,
    primary_workspace_root,
    workspace_provider
  )

  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: t('command.apply-context.action.delete')
  }

  while (true) {
    const create_quick_pick_items = async (
      paths: string[],
      selected_paths_override?: Set<string>
    ) => {
      const currently_checked = workspace_provider.get_checked_files()
      const currently_checked_set =
        selected_paths_override || new Set(currently_checked)

      return Promise.all(
        paths.map(async (file_path) => {
          const token_count =
            await workspace_provider.calculate_file_tokens(file_path)
          const formatted_token_count = display_token_count(token_count.total)
          const workspace_root =
            workspace_provider.get_workspace_root_for_file(file_path)
          const relative_path = workspace_root
            ? path.relative(workspace_root, file_path)
            : file_path
          const dir_name = path.dirname(relative_path)
          const display_dir = dir_name == '.' ? '' : dir_name

          const buttons: vscode.QuickInputButton[] = [
            {
              iconPath: new vscode.ThemeIcon('go-to-file'),
              tooltip: 'Go to file'
            }
          ]

          if (update_context_paths) {
            buttons.push(delete_button)
          }

          return {
            label: path.basename(file_path),
            description: display_dir
              ? `${formatted_token_count} · ${display_dir}`
              : formatted_token_count,
            picked: currently_checked_set.has(file_path),
            file_path,
            buttons,
            token_count: token_count.total
          }
        })
      )
    }

    const quick_pick_items = await create_quick_pick_items(resolved_paths)

    const total_tokens = quick_pick_items.reduce(
      (acc, item) => acc + item.token_count,
      0
    )
    const formatted_total = display_token_count(total_tokens)

    const list_quick_pick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { file_path: string; token_count: number }
    >()
    list_quick_pick.title = context.name
    list_quick_pick.placeholder = `Select files to apply to context (totalling ${formatted_total} tokens)`
    list_quick_pick.canSelectMany = true
    list_quick_pick.ignoreFocusOut = true
    list_quick_pick.items = quick_pick_items
    list_quick_pick.selectedItems = quick_pick_items.filter((i) => i.picked)
    list_quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const list_selection = await new Promise<
      | readonly (vscode.QuickPickItem & {
          file_path: string
          token_count: number
        })[]
      | 'back'
      | undefined
    >((resolve) => {
      let is_resolved = false
      const resolve_once = (value: any) => {
        if (!is_resolved) {
          is_resolved = true
          resolve(value)
        }
      }

      list_quick_pick.onDidTriggerButton((button) => {
        if (button === vscode.QuickInputButtons.Back) {
          list_quick_pick.hide()
          resolve_once('back')
        }
      })

      list_quick_pick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === 'Go to file') {
          const uri = vscode.Uri.file(e.item.file_path)
          vscode.window.showTextDocument(uri, {
            preview: true,
            preserveFocus: true
          })
        } else if (e.button === delete_button) {
          const current_timestamp = Date.now()
          active_deletion_timestamp = current_timestamp
          const deleted_path = e.item.file_path

          const original_paths = [...resolved_paths]
          resolved_paths = resolved_paths.filter((p) => p !== deleted_path)

          if (update_context_paths) {
            await update_context_paths(resolved_paths)
          }

          const current_selected = new Set(
            list_quick_pick.selectedItems.map((i) => i.file_path)
          )
          list_quick_pick.items = await create_quick_pick_items(
            resolved_paths,
            current_selected
          )
          list_quick_pick.selectedItems = list_quick_pick.items.filter(
            (i) => i.picked
          )

          const new_total = list_quick_pick.items.reduce(
            (acc, item) => acc + item.token_count,
            0
          )
          list_quick_pick.placeholder = `Select files to apply to context (totalling ${display_token_count(new_total)} tokens)`

          const choice = await vscode.window.showInformationMessage(
            'Removed from context.',
            'Undo'
          )

          if (active_deletion_timestamp !== current_timestamp) {
            if (choice === 'Undo') {
              vscode.window.showInformationMessage(
                t('command.apply-context.undo.failed')
              )
            }
            return
          }

          if (choice === 'Undo') {
            resolved_paths = original_paths
            if (update_context_paths) {
              await update_context_paths(resolved_paths)
            }
            const current_selected_undo = new Set(
              list_quick_pick.selectedItems.map((i) => i.file_path)
            )
            list_quick_pick.items = await create_quick_pick_items(
              resolved_paths,
              current_selected_undo
            )
            list_quick_pick.selectedItems = list_quick_pick.items.filter(
              (i) => i.picked
            )

            const undo_total = list_quick_pick.items.reduce(
              (acc, item) => acc + item.token_count,
              0
            )
            list_quick_pick.placeholder = `Select files to apply to context (totalling ${display_token_count(undo_total)} tokens)`
          }
        }
      })

      list_quick_pick.onDidAccept(() => {
        list_quick_pick.hide()
        resolve_once(list_quick_pick.selectedItems)
      })

      list_quick_pick.onDidHide(() => {
        resolve_once(undefined)
        list_quick_pick.dispose()
      })

      list_quick_pick.show()
    })

    if (!list_selection) return undefined
    if (list_selection === 'back') return 'back'

    if (Array.isArray(list_selection)) {
      const new_checked = list_selection.map((i) => i.file_path)
      const select_paths_set = new Set(resolved_paths)
      const current_checked_files = workspace_provider.get_checked_files()
      const final_checked = current_checked_files
        .filter((p) => !select_paths_set.has(p))
        .concat(new_checked)
      await workspace_provider.set_checked_files([...new Set(final_checked)])
      return undefined
    }
  }
}
