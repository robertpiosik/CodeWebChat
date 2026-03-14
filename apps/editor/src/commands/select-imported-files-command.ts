import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace/workspace-provider'
import { display_token_count } from '../utils/display-token-count'

export const select_imported_files_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectImportedFiles',
    async (item: FileItem) => {
      if (!item) return

      const is_valid_uri = (uri_str: string): boolean => {
        const uri = vscode.Uri.parse(uri_str)
        const file_path = uri.fsPath
        const workspace_root =
          workspace_provider.get_workspace_root_for_file(file_path)
        if (!workspace_root) return false
        const relative_path = path.relative(workspace_root, file_path)
        return (
          !workspace_provider.is_ignored_by_patterns(file_path) &&
          !workspace_provider.is_excluded(relative_path)
        )
      }

      const get_all_files = async (uri: vscode.Uri): Promise<vscode.Uri[]> => {
        try {
          const stat = await vscode.workspace.fs.stat(uri)
          if (stat.type & vscode.FileType.File) {
            return [uri]
          } else if (stat.type & vscode.FileType.Directory) {
            const results: vscode.Uri[] = []
            const entries = await vscode.workspace.fs.readDirectory(uri)
            for (const [name, type] of entries) {
              const child_uri = vscode.Uri.joinPath(uri, name)
              if (!is_valid_uri(child_uri.toString())) continue
              if (type & vscode.FileType.File) {
                results.push(child_uri)
              } else if (type & vscode.FileType.Directory) {
                results.push(...(await get_all_files(child_uri)))
              }
            }
            return results
          }
        } catch {}
        return []
      }

      const starting_uris = await get_all_files(item.resourceUri)
      if (starting_uris.length === 0) {
        vscode.window.showInformationMessage('No valid files found to select.')
        return
      }

      const get_imports_for_uri = async (
        document_uri: vscode.Uri
      ): Promise<string[]> => {
        const found_uris = new Set<string>()
        try {
          const document = await vscode.workspace.openTextDocument(document_uri)
          const text = document.getText()
          const lines = text.split('\n')
          const ext = path.extname(document_uri.fsPath).toLowerCase()

          let in_import_block = false
          const positions_to_check: vscode.Position[] = []

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            if (
              [
                '.ts',
                '.js',
                '.tsx',
                '.jsx',
                '.mjs',
                '.cjs',
                '.vue',
                '.svelte',
                '.astro'
              ].includes(ext)
            ) {
              if (/\b(import|export|require)\b/.test(line)) {
                const matches = [...line.matchAll(/["']([^"']+)["']/g)]
                for (const match of matches) {
                  positions_to_check.push(
                    new vscode.Position(i, match.index! + 1)
                  )
                }
              }
            } else if (ext == '.py') {
              const from_match = line.match(/^\s*from\s+([a-zA-Z0-9_.]+)/)
              if (from_match) {
                const offset = line.indexOf(from_match[1], from_match.index)
                positions_to_check.push(
                  new vscode.Position(
                    i,
                    offset + Math.floor(from_match[1].length / 2)
                  )
                )
              }
              const import_match = line.match(/^\s*import\s+([a-zA-Z0-9_., ]+)/)
              if (import_match) {
                const group_offset = line.indexOf(
                  import_match[1],
                  import_match.index
                )
                const words = [...import_match[1].matchAll(/[a-zA-Z0-9_.]+/g)]
                for (const word of words) {
                  const offset = group_offset + word.index!
                  positions_to_check.push(
                    new vscode.Position(
                      i,
                      offset + Math.floor(word[0].length / 2)
                    )
                  )
                }
              }
            } else if (
              ['.c', '.cpp', '.h', '.hpp', '.cc', '.cxx'].includes(ext)
            ) {
              const inc_match = line.match(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/)
              if (inc_match) {
                const offset = line.indexOf(inc_match[1], inc_match.index)
                positions_to_check.push(
                  new vscode.Position(
                    i,
                    offset + Math.floor(inc_match[1].length / 2)
                  )
                )
              }
            } else if (['.cs', '.java'].includes(ext)) {
              const regex =
                ext == '.cs'
                  ? /^\s*using\s+([a-zA-Z0-9_.]+)\s*;/
                  : /^\s*import\s+([a-zA-Z0-9_.*]+)\s*;/
              const match = line.match(regex)
              if (match) {
                const offset = line.indexOf(match[1], match.index)
                positions_to_check.push(
                  new vscode.Position(
                    i,
                    offset + Math.floor(match[1].length / 2)
                  )
                )
              }
            } else if (ext == '.rs') {
              const match = line.match(/^\s*(?:use|mod)\s+([a-zA-Z0-9_:]+)/)
              if (match) {
                const offset = line.indexOf(match[1], match.index)
                positions_to_check.push(
                  new vscode.Position(
                    i,
                    offset + Math.floor(match[1].length / 2)
                  )
                )
              }
            } else if (ext == '.go') {
              if (/^\s*import\s+\(/.test(line)) {
                in_import_block = true
              } else if (in_import_block && /\)/.test(line)) {
                in_import_block = false
              } else if (in_import_block || /^\s*import\s+/.test(line)) {
                const match = line.match(/"([^"]+)"/)
                if (match) {
                  const offset = line.indexOf(match[1], match.index)
                  positions_to_check.push(
                    new vscode.Position(
                      i,
                      offset + Math.floor(match[1].length / 2)
                    )
                  )
                }
              }
            } else if (ext == '.rb') {
              if (/^\s*require(?:_relative)?\b/.test(line)) {
                const match = line.match(/['"]([^'"]+)['"]/)
                if (match) {
                  const offset = line.indexOf(match[1], match.index)
                  positions_to_check.push(
                    new vscode.Position(
                      i,
                      offset + Math.floor(match[1].length / 2)
                    )
                  )
                }
              }
            } else if (ext == '.php') {
              if (
                /^\s*(?:include|require|include_once|require_once|use)\b/.test(
                  line
                )
              ) {
                const str_match = line.match(/['"]([^'"]+)['"]/)
                if (str_match) {
                  const offset = line.indexOf(str_match[1], str_match.index)
                  positions_to_check.push(
                    new vscode.Position(
                      i,
                      offset + Math.floor(str_match[1].length / 2)
                    )
                  )
                } else {
                  const use_match = line.match(/^\s*use\s+([a-zA-Z0-9_\\]+)/)
                  if (use_match) {
                    const offset = line.indexOf(use_match[1], use_match.index)
                    positions_to_check.push(
                      new vscode.Position(
                        i,
                        offset + Math.floor(use_match[1].length / 2)
                      )
                    )
                  }
                }
              }
            } else {
              let is_import_line = false

              if (
                /^\s*(?:#\s*)?(import|from|require|include|using|use)\b/.test(
                  line
                )
              ) {
                is_import_line = true
                if (/[{(]/.test(line) && !/[})]/.test(line)) {
                  in_import_block = true
                }
              } else if (in_import_block) {
                is_import_line = true
                if (/[})]/.test(line)) {
                  in_import_block = false
                }
              } else if (
                /\b(from|require|import|include)\s*\(?["']/.test(line)
              ) {
                is_import_line = true
              }

              if (is_import_line) {
                const matches = [...line.matchAll(/["']([^"']+)["']/g)]
                if (matches.length > 0) {
                  for (const match of matches) {
                    positions_to_check.push(
                      new vscode.Position(i, match.index! + 1)
                    )
                  }
                } else {
                  const words = [...line.matchAll(/[\w./\\]+/g)]
                  for (const word of words) {
                    if (
                      [
                        'import',
                        'from',
                        'require',
                        'include',
                        'using',
                        'use',
                        'as'
                      ].includes(word[0])
                    )
                      continue
                    positions_to_check.push(
                      new vscode.Position(
                        i,
                        word.index! + Math.floor(word[0].length / 2)
                      )
                    )
                  }
                }
              }
            }
          }

          for (const position of positions_to_check) {
            try {
              const definitions = await vscode.commands.executeCommand<
                vscode.Location[] | vscode.LocationLink[]
              >('vscode.executeDefinitionProvider', document.uri, position)
              if (definitions) {
                for (const def of definitions) {
                  const uri = 'uri' in def ? def.uri : def.targetUri
                  if (uri.scheme == 'file') found_uris.add(uri.toString())
                }
              }
            } catch {}
          }
        } catch {}
        return Array.from(found_uris)
      }

      const immediate_uris = new Set<string>()
      const recursive_uris = new Set<string>()
      const visited_uris = new Set<string>(
        starting_uris.map((u) => u.toString())
      )

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Processing imports...'
        },
        async () => {
          const queue: vscode.Uri[] = []

          for (const start_uri of starting_uris) {
            const immediate = await get_imports_for_uri(start_uri)
            for (const uri_str of immediate) {
              if (!visited_uris.has(uri_str)) {
                visited_uris.add(uri_str)
                if (is_valid_uri(uri_str)) {
                  immediate_uris.add(uri_str)
                  queue.push(vscode.Uri.parse(uri_str))
                }
              }
            }
          }

          while (queue.length > 0) {
            const current_uri = queue.shift()!
            const imports = await get_imports_for_uri(current_uri)
            for (const uri_str of imports) {
              if (!visited_uris.has(uri_str)) {
                visited_uris.add(uri_str)
                if (is_valid_uri(uri_str)) {
                  recursive_uris.add(uri_str)
                  queue.push(vscode.Uri.parse(uri_str))
                }
              }
            }
          }
        }
      )

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
            const display_dir = dir_name == '.' ? '' : dir_name

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
        quick_pick_items.push(...(await map_to_quick_pick(valid_immediate)))
      }

      if (valid_recursive.length > 0) {
        quick_pick_items.push({
          label: 'recursive',
          kind: vscode.QuickPickItemKind.Separator
        })
        quick_pick_items.push(...(await map_to_quick_pick(valid_recursive)))
      }

      const quick_pick = vscode.window.createQuickPick<ImportQuickPickItem>()
      quick_pick.items = quick_pick_items
      quick_pick.selectedItems = quick_pick_items.filter((item) => item.picked)
      quick_pick.canSelectMany = true
      quick_pick.placeholder = 'Select imported files'
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
