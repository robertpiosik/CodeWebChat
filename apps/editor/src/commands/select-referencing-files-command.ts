import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { display_token_count } from '../utils/display-token-count'
import { t } from '../i18n'
import { get_all_files } from './select-imported-files-command/utils/get-all-files'

export const select_referencing_files_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectReferencingFiles',
    async (item?: FileItem) => {
      try {
        let is_folder = false
        if (item && item.resourceUri) {
          try {
            const stat = await vscode.workspace.fs.stat(item.resourceUri)
            is_folder = (stat.type & vscode.FileType.Directory) !== 0
          } catch {}
        }

        let matched_files: { file_path: string; range: vscode.Range }[] = []

        if (is_folder && item?.resourceUri) {
          const folder_uri = item.resourceUri
          const starting_uris = await get_all_files(
            folder_uri,
            workspace_provider
          )

          if (starting_uris.length == 0) {
            vscode.window.showInformationMessage(
              t('command.context.select-references.no-files')
            )
            return
          }

          const file_map = new Map<string, vscode.Range>()
          let is_cancelled = false

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: t('command.context.select-references.searching'),
              cancellable: true
            },
            async (progress, token) => {
              let processed_files = 0
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
                    processed_files++
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

                    progress.report({
                      message: `${path.basename(uri.fsPath)} (${i + 1}/${positions.length})`
                    })

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

                processed_files++
                progress.report({
                  increment: (1 / starting_uris.length) * 100,
                  message: `${processed_files}/${starting_uris.length}`
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
        } else {
          const editor = vscode.window.activeTextEditor
          if (!editor) {
            return
          }

          const document = editor.document
          const position = editor.selection.active

          matched_files = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: t('command.context.select-references.searching')
            },
            async () => {
              const locations = await vscode.commands.executeCommand<
                vscode.Location[]
              >('vscode.executeReferenceProvider', document.uri, position)

              if (!locations) return []

              const current_file_path = document.uri.fsPath
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
        }

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(
            t('command.context.select-references.no-files')
          )
          return
        }

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('go-to-file'),
          tooltip: t('common.go-to-file')
        }

        const currently_checked = workspace_provider.get_checked_files()

        const quick_pick_items = await Promise.all(
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

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { file_path: string; range: vscode.Range }
        >()
        quick_pick.items = quick_pick_items
        quick_pick.selectedItems = quick_pick_items.filter((item) =>
          currently_checked.includes(item.file_path)
        )
        quick_pick.canSelectMany = true
        quick_pick.placeholder = t(
          'command.context.select-references.select-files'
        )
        quick_pick.title = t('command.context.select-references.search-results')
        quick_pick.ignoreFocusOut = true

        const close_button = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
        }
        quick_pick.buttons = [close_button]

        const selected_items = await new Promise<
          | readonly (vscode.QuickPickItem & {
              file_path: string
              range: vscode.Range
            })[]
          | undefined
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
                  t('command.context.select-references.error-opening', {
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

        const selected_paths = selected_items.map((item) => item.file_path)

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
          t('command.context.select-references.context-updated')
        )
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.context.select-references.failed', {
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
