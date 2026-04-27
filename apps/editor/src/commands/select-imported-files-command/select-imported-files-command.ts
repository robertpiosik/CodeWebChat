import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../../context/providers/workspace/workspace-provider'
import { display_token_count } from '../../utils/display-token-count'
import { is_valid_uri } from './utils/is-valid-uri'
import { get_all_files } from './utils/get-all-files'
import { get_imports_for_uri } from './utils/get-imports-for-uri'

export const select_imported_files_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectImportedFiles',
    async (item: FileItem) => {
      if (!item) return

      const starting_uris = await get_all_files(
        item.resourceUri,
        workspace_provider
      )
      if (starting_uris.length == 0) {
        vscode.window.showInformationMessage('No valid files found to select.')
        return
      }

      const immediate_uris = new Set<string>()
      const recursive_uris = new Set<string>()
      const visited_uris = new Set<string>(
        starting_uris.map((u) => u.toString())
      )

      let is_cancelled = false

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Processing imports...',
          cancellable: true
        },
        async (progress, token) => {
          const queue: vscode.Uri[] = []

          for (const starting_uri of starting_uris) {
            if (token.isCancellationRequested) {
              is_cancelled = true
              break
            }
            const imports = await get_imports_for_uri(starting_uri, token)
            for (const uri_str of imports) {
              if (!visited_uris.has(uri_str)) {
                visited_uris.add(uri_str)
                if (is_valid_uri(uri_str, workspace_provider)) {
                  immediate_uris.add(uri_str)
                  queue.push(vscode.Uri.parse(uri_str))
                }
              }
            }
          }

          while (queue.length > 0) {
            if (token.isCancellationRequested) {
              is_cancelled = true
              break
            }
            const current_uri = queue.shift()!
            const imports = await get_imports_for_uri(current_uri, token)
            for (const uri_str of imports) {
              if (!visited_uris.has(uri_str)) {
                visited_uris.add(uri_str)
                if (is_valid_uri(uri_str, workspace_provider)) {
                  recursive_uris.add(uri_str)
                  queue.push(vscode.Uri.parse(uri_str))
                }
              }
            }
          }
        }
      )

      if (is_cancelled) {
        return
      }

      const valid_immediate = Array.from(immediate_uris).map((u) =>
        vscode.Uri.parse(u)
      )
      const valid_recursive = Array.from(recursive_uris).map((u) =>
        vscode.Uri.parse(u)
      )

      if (valid_immediate.length == 0 && valid_recursive.length == 0) {
        vscode.window.showInformationMessage('No imported files found.')
        return
      }

      const currently_checked = workspace_provider.get_checked_files()

      const open_file_button = {
        iconPath: new vscode.ThemeIcon('go-to-file'),
        tooltip: 'Go to file'
      }

      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }

      type ImportQuickPickItem = vscode.QuickPickItem & {
        uri?: vscode.Uri
        picked?: boolean
        tokens?: number
      }

      const map_to_quick_pick = async (
        uris: vscode.Uri[]
      ): Promise<ImportQuickPickItem[]> => {
        return Promise.all(
          uris.map(async (uri) => {
            const file_path = uri.fsPath
            const workspace_root =
              workspace_provider.get_workspace_root_for_file(file_path)!
            const relative_path = path.relative(workspace_root, file_path)
            const dir_name = path.dirname(relative_path)
            let display_dir = dir_name == '.' ? '' : dir_name

            if (workspace_provider.get_workspace_roots().length > 1) {
              const workspace_name =
                workspace_provider.get_workspace_name(workspace_root)
              display_dir = display_dir
                ? `${workspace_name}/${display_dir}`
                : workspace_name
            }

            const token_count =
              await workspace_provider.calculate_file_tokens(file_path)
            const formatted_token_count = display_token_count(token_count.total)

            const is_picked = currently_checked.includes(file_path)

            return {
              label: path.basename(file_path),
              description: display_dir
                ? `${formatted_token_count} · ${display_dir}`
                : formatted_token_count,
              picked: is_picked,
              uri: uri,
              tokens: token_count.total,
              buttons: [open_file_button]
            }
          })
        )
      }

      const quick_pick_items: ImportQuickPickItem[] = []

      if (valid_immediate.length > 0) {
        quick_pick_items.push({
          label: 'immediate',
          kind: vscode.QuickPickItemKind.Separator
        })
        const immediate_items = await map_to_quick_pick(valid_immediate)
        quick_pick_items.push(...immediate_items)
      }

      if (valid_recursive.length > 0) {
        quick_pick_items.push({
          label: 'recursive',
          kind: vscode.QuickPickItemKind.Separator
        })
        const recursive_items = await map_to_quick_pick(valid_recursive)
        quick_pick_items.push(...recursive_items)
      }

      const quick_pick = vscode.window.createQuickPick<ImportQuickPickItem>()
      quick_pick.items = quick_pick_items
      quick_pick.selectedItems = quick_pick_items.filter((item) => item.picked)
      quick_pick.canSelectMany = true
      quick_pick.matchOnDescription = true

      const update_placeholder = () => {
        const total = quick_pick.selectedItems.reduce(
          (sum, item) => sum + (item.tokens || 0),
          0
        )
        const total_text =
          total > 0 ? ` (totalling ${display_token_count(total)} tokens)` : ''
        quick_pick.placeholder = `Select imported files${total_text}`
      }
      update_placeholder()
      quick_pick.onDidChangeSelection(update_placeholder)

      quick_pick.title = 'Imported Files'
      quick_pick.ignoreFocusOut = true
      quick_pick.buttons = [close_button]

      const selected_items = await new Promise<
        readonly ImportQuickPickItem[] | undefined
      >((resolve) => {
        let is_accepted = false

        quick_pick.onDidTriggerButton((button) => {
          if (button === close_button) {
            resolve(undefined)
            quick_pick.hide()
          }
        })

        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems)
          quick_pick.hide()
        })

        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          quick_pick.dispose()
        })

        quick_pick.onDidTriggerItemButton(async (e) => {
          if (e.button === open_file_button && e.item.uri) {
            try {
              const doc = await vscode.workspace.openTextDocument(e.item.uri)
              await vscode.window.showTextDocument(doc, { preview: true })
            } catch (error) {
              vscode.window.showErrorMessage(
                `Error opening file: ${String(error)}`
              )
            }
          }
        })

        quick_pick.show()
      })

      if (selected_items === undefined) {
        return
      }

      const valid_selected = selected_items.filter((i) => i.uri !== undefined)

      const shown_paths = quick_pick_items
        .filter(
          (item) => item.kind !== vscode.QuickPickItemKind.Separator && item.uri
        )
        .map((item) => item.uri!.fsPath)

      const selected_paths = valid_selected.map((item) => item.uri!.fsPath)

      const paths_to_apply = [
        ...new Set([
          ...currently_checked.filter((p) => !shown_paths.includes(p)),
          ...selected_paths
        ])
      ]

      await workspace_provider.set_checked_files(paths_to_apply)
    }
  )
}
