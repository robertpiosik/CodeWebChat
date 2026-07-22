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
import { t } from '@/i18n'
import { search_files } from '@/features/search-files'

export const select_imported_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
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
        vscode.window.showInformationMessage(
          t('command.select-imported-files.no-valid-files')
        )
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
          title: t('command.select-imported-files.processing'),
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
        vscode.window.showInformationMessage(
          t('command.select-imported-files.no-files')
        )
        return
      }

      const currently_checked = workspace_provider.get_checked_files()

      const open_file_button = {
        iconPath: new vscode.ThemeIcon('go-to-file'),
        tooltip: t('command.select-imported-files.go-to-file')
      }

      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('command.select-imported-files.close')
      }

      const search_button = {
        iconPath: new vscode.ThemeIcon('search'),
        tooltip: t('command.search.title')
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
          label: t('command.select-imported-files.immediate'),
          kind: vscode.QuickPickItemKind.Separator
        })
        const immediate_items = await map_to_quick_pick(valid_immediate)
        quick_pick_items.push(...immediate_items)
      }

      if (valid_recursive.length > 0) {
        quick_pick_items.push({
          label: t('command.select-imported-files.recursive'),
          kind: vscode.QuickPickItemKind.Separator
        })
        const recursive_items = await map_to_quick_pick(valid_recursive)
        quick_pick_items.push(...recursive_items)
      }

      let current_selected_items = quick_pick_items.filter(
        (item) => item.picked
      )
      let selected_paths: string[] = []
      const shown_paths = quick_pick_items
        .filter(
          (item) => item.kind !== vscode.QuickPickItemKind.Separator && item.uri
        )
        .map((item) => item.uri!.fsPath)

      while (true) {
        const quick_pick = vscode.window.createQuickPick<ImportQuickPickItem>()
        quick_pick.items = quick_pick_items
        quick_pick.selectedItems = current_selected_items
        quick_pick.canSelectMany = true
        quick_pick.matchOnDescription = true

        const update_placeholder = () => {
          const total = quick_pick.selectedItems.reduce(
            (sum, item) => sum + (item.tokens || 0),
            0
          )

          if (total > 0) {
            quick_pick.placeholder = t(
              'command.select-imported-files.placeholder-tokens',
              { tokens: display_token_count(total) }
            )
          } else {
            quick_pick.placeholder = t(
              'command.select-imported-files.placeholder'
            )
          }
        }
        update_placeholder()
        quick_pick.onDidChangeSelection(update_placeholder)

        quick_pick.title = t('command.select-imported-files.title')
        quick_pick.ignoreFocusOut = true
        quick_pick.buttons = [search_button, close_button]

        const selected_items = await new Promise<
          readonly ImportQuickPickItem[] | undefined | 'search'
        >((resolve) => {
          let is_accepted = false

          quick_pick.onDidTriggerButton((button) => {
            if (button === close_button) {
              resolve(undefined)
              quick_pick.hide()
            } else if (button === search_button) {
              current_selected_items = [...quick_pick.selectedItems]
              resolve('search')
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
                  t('command.select-imported-files.error-opening', {
                    error: String(error)
                  })
                )
              }
            }
          })

          quick_pick.show()
        })

        if (selected_items === undefined) {
          return
        }

        if (selected_items == 'search') {
          let should_return = false
          let back_to_main = false

          while (true) {
            let paths_for_search = shown_paths

            if (valid_recursive.length > 0) {
              const scope_selection = await new Promise<
                'immediate' | 'all' | 'back' | undefined
              >((resolve) => {
                const scope_quick_pick = vscode.window.createQuickPick()
                scope_quick_pick.items = [
                  { label: t('command.select-imported-files.immediate-only') },
                  {
                    label: t(
                      'command.select-imported-files.immediate-and-recursive'
                    )
                  }
                ]
                scope_quick_pick.title = t(
                  'command.select-imported-files.search-scope'
                )
                scope_quick_pick.ignoreFocusOut = true
                scope_quick_pick.buttons = [
                  vscode.QuickInputButtons.Back,
                  close_button
                ]

                let is_accepted = false

                scope_quick_pick.onDidTriggerButton((button) => {
                  if (button === vscode.QuickInputButtons.Back) {
                    resolve('back')
                    scope_quick_pick.hide()
                  } else if (button === close_button) {
                    resolve(undefined)
                    scope_quick_pick.hide()
                  }
                })

                scope_quick_pick.onDidAccept(() => {
                  is_accepted = true
                  const selected = scope_quick_pick.selectedItems[0]?.label
                  if (
                    selected ===
                    t('command.select-imported-files.immediate-only')
                  ) {
                    resolve('immediate')
                  } else {
                    resolve('all')
                  }
                  scope_quick_pick.hide()
                })

                scope_quick_pick.onDidHide(() => {
                  if (!is_accepted) {
                    resolve(undefined)
                  }
                  scope_quick_pick.dispose()
                })

                scope_quick_pick.show()
              })

              if (scope_selection === undefined) {
                should_return = true
                break
              }

              if (scope_selection === 'back') {
                back_to_main = true
                break
              }

              if (scope_selection === 'immediate') {
                paths_for_search = valid_immediate.map((u) => u.fsPath)
              }
            }

            const search_result = await search_files({
              files: paths_for_search,
              workspace_provider,
              extension_context,
              show_back_button: true
            })

            if (search_result == 'back') {
              if (valid_recursive.length > 0) {
                continue
              } else {
                back_to_main = true
                break
              }
            }

            if (!search_result) {
              should_return = true
              break
            }

            selected_paths = search_result.selected_paths
            break
          }

          if (should_return) {
            return
          }

          if (back_to_main) {
            continue
          }

          break
        } else {
          const valid_selected = selected_items.filter(
            (i) => i.uri !== undefined
          )
          selected_paths = valid_selected.map((item) => item.uri!.fsPath)
          break
        }
      }

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
