import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { display_token_count } from '../utils/display-token-count'
import { t } from '../i18n'
import { get_all_files } from './select-imported-files-command/utils/get-all-files'
import { search_files } from '@/features/search-files'

export const select_referencing_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectReferencingFiles',
    async (item?: any) => {
      try {
        let matched_files: { file_path: string; range: vscode.Range }[] = []

        let target_uri: vscode.Uri | undefined

        let should_check_position = false
        let target_position: vscode.Position | undefined

        if (item?.resourceUri) {
          target_uri = item.resourceUri
        } else if (
          item instanceof vscode.Uri ||
          (item && item.fsPath && item.scheme)
        ) {
          target_uri = item as vscode.Uri
          const editor = vscode.window.activeTextEditor
          if (editor && editor.document.uri.fsPath === target_uri.fsPath) {
            should_check_position = true
            target_position = editor.selection.active
          }
        } else {
          const editor = vscode.window.activeTextEditor
          if (editor) {
            target_uri = editor.document.uri
            should_check_position = true
            target_position = editor.selection.active
          }
        }

        if (!target_uri) {
          return
        }

        let do_whole_file_search = true

        if (should_check_position && target_position) {
          matched_files = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: t('command.select-referencing-files.searching')
            },
            async () => {
              const locations = await vscode.commands.executeCommand<
                vscode.Location[]
              >(
                'vscode.executeReferenceProvider',
                target_uri!,
                target_position!
              )

              if (!locations || locations.length === 0) return []

              const current_file_path = target_uri!.fsPath
              const file_map = new Map<string, vscode.Range>()
              locations.forEach((loc) => {
                const file_path = loc.uri.fsPath

                if (file_path == current_file_path) return

                if (
                  workspace_provider.get_workspace_root_for_file(file_path) &&
                  !workspace_provider.is_ignored_by_patterns(file_path)
                ) {
                  if (!file_map.has(file_path)) {
                    file_map.set(file_path, loc.range)
                  }
                }
              })
              return Array.from(file_map.entries()).map(
                ([file_path, range]) => ({
                  file_path,
                  range
                })
              )
            }
          )

          if (matched_files.length > 0) {
            do_whole_file_search = false
          }
        }

        if (do_whole_file_search) {
          const starting_uris = await get_all_files(
            target_uri!,
            workspace_provider
          )

          if (starting_uris.length == 0) {
            vscode.window.showInformationMessage(
              t('command.select-referencing-files.no-files')
            )
            return
          }

          const file_map = new Map<string, vscode.Range>()
          let is_cancelled = false

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: t('command.select-referencing-files.searching'),
              cancellable: true
            },
            async (progress, token) => {
              for (const uri of starting_uris) {
                if (token.isCancellationRequested) {
                  is_cancelled = true
                  break
                }

                try {
                  const symbols = await vscode.commands.executeCommand<
                    vscode.DocumentSymbol[] | vscode.SymbolInformation[]
                  >('vscode.executeDocumentSymbolProvider', uri)

                  if (!symbols) {
                    continue
                  }

                  const positions: vscode.Position[] = []
                  const top_level_containers = new Set<string>()

                  const traverse = (syms: any[]) => {
                    for (const sym of syms) {
                      if (sym.selectionRange) {
                        positions.push(sym.selectionRange.start)
                        const is_container =
                          sym.kind === vscode.SymbolKind.Module ||
                          sym.kind === vscode.SymbolKind.Namespace ||
                          sym.kind === vscode.SymbolKind.Package

                        if (
                          is_container &&
                          sym.children &&
                          sym.children.length > 0
                        ) {
                          traverse(sym.children)
                        }
                      } else if (sym.location) {
                        const is_container =
                          sym.kind === vscode.SymbolKind.Module ||
                          sym.kind === vscode.SymbolKind.Namespace ||
                          sym.kind === vscode.SymbolKind.Package

                        if (is_container) {
                          top_level_containers.add(sym.name)
                        }

                        if (
                          !sym.containerName ||
                          top_level_containers.has(sym.containerName)
                        ) {
                          positions.push(sym.location.range.start)
                        }
                      }
                    }
                  }
                  traverse(symbols)

                  for (let i = 0; i < positions.length; i++) {
                    if (token.isCancellationRequested) {
                      is_cancelled = true
                      break
                    }
                    const position = positions[i]

                    const locations = await vscode.commands.executeCommand<
                      vscode.Location[]
                    >('vscode.executeReferenceProvider', uri, position)

                    if (locations) {
                      locations.forEach((loc) => {
                        const file_path = loc.uri.fsPath
                        if (file_path == uri.fsPath) return
                        if (
                          workspace_provider.get_workspace_root_for_file(
                            file_path
                          ) &&
                          !workspace_provider.is_ignored_by_patterns(file_path)
                        ) {
                          if (!file_map.has(file_path)) {
                            file_map.set(file_path, loc.range)
                          }
                        }
                      })
                    }
                  }
                } catch (err) {
                  Logger.error({
                    function_name: 'select_referencing_files_command',
                    message: `Error processing symbols for ${uri.fsPath}`,
                    data: err
                  })
                }

                progress.report({
                  increment: (1 / starting_uris.length) * 100
                })
              }
            }
          )

          if (is_cancelled) {
            return
          }

          matched_files = Array.from(file_map.entries()).map(
            ([file_path, range]) => ({
              file_path,
              range
            })
          )
        }

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(
            t('command.select-referencing-files.no-files')
          )
          return
        }

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('go-to-file'),
          tooltip: t('common.go-to-file')
        }

        const currently_checked = workspace_provider.get_checked_files()

        const quick_pick_items: (vscode.QuickPickItem & {
          file_path: string
          range: vscode.Range
        })[] = await Promise.all(
          matched_files.map(async ({ file_path, range }) => {
            const workspace_root =
              workspace_provider.get_workspace_root_for_file(file_path)
            const relative_path = workspace_root
              ? path.relative(workspace_root, file_path)
              : file_path

            const dir_name = path.dirname(relative_path)
            const display_dir = dir_name == '.' ? '' : dir_name

            const token_count =
              await workspace_provider.calculate_file_tokens(file_path)
            const formatted_token_count = display_token_count(token_count.total)

            return {
              label: path.basename(file_path),
              description: display_dir
                ? `${formatted_token_count} · ${display_dir}`
                : formatted_token_count,
              file_path,
              range,
              buttons: [open_file_button]
            }
          })
        )

        let current_selected_items = quick_pick_items.filter((item) =>
          currently_checked.includes(item.file_path)
        )
        let selected_paths: string[] = []

        while (true) {
          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { file_path: string; range: vscode.Range }
          >()
          quick_pick.items = quick_pick_items
          quick_pick.selectedItems = current_selected_items
          quick_pick.canSelectMany = true
          quick_pick.placeholder = t(
            'command.select-referencing-files.select-files'
          )
          quick_pick.title = t(
            'command.select-referencing-files.search-results'
          )
          quick_pick.ignoreFocusOut = true

          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
          const search_button = {
            iconPath: new vscode.ThemeIcon('search'),
            tooltip: t('command.select-referencing-files.search')
          }
          quick_pick.buttons = [search_button, close_button]

          const selected_items = await new Promise<
            | readonly (vscode.QuickPickItem & {
                file_path: string
                range: vscode.Range
              })[]
            | undefined
            | 'search'
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
              if (e.button === open_file_button) {
                try {
                  const doc = await vscode.workspace.openTextDocument(
                    e.item.file_path
                  )
                  await vscode.window.showTextDocument(doc, {
                    preview: true,
                    selection: e.item.range
                  })
                } catch (error) {
                  vscode.window.showErrorMessage(
                    t('command.select-referencing-files.error-opening', {
                      error: String(error)
                    })
                  )
                }
              }
            })

            quick_pick.show()
          })

          if (!selected_items) {
            return
          }

          if (selected_items === 'search') {
            const search_result = await search_files({
              get_files: async () => matched_files.map((m) => m.file_path),
              workspace_provider,
              extension_context,
              show_back_button: true,
              disable_semantic: true
            })

            if (search_result === 'back') {
              continue
            }

            if (!search_result) {
              return
            }

            selected_paths = search_result.selected_paths
            break
          } else {
            selected_paths = selected_items.map((item) => item.file_path)
            break
          }
        }

        const selected_paths_set = new Set(selected_paths)
        const unselected_files_set = new Set(
          matched_files
            .map((m) => m.file_path)
            .filter((file_path) => !selected_paths_set.has(file_path))
        )
        const latest_checked = workspace_provider.get_checked_files()
        const latest_checked_filtered = latest_checked.filter(
          (file) => !unselected_files_set.has(file)
        )
        const paths_to_apply = [
          ...new Set([...latest_checked_filtered, ...selected_paths])
        ]

        Logger.info({
          message: `Selected ${selected_paths.length} files from reference search.`,
          data: { paths: selected_paths }
        })

        await workspace_provider.set_checked_files(paths_to_apply)
        vscode.window.showInformationMessage(
          t('command.select-referencing-files.context-updated')
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.select-referencing-files.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'select_referencing_files_command',
          message: 'Error searching references',
          data: error
        })
      }
    }
  )
}
