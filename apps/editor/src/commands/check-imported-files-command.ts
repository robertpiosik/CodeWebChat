import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace/workspace-provider'
import { display_token_count } from '../utils/display-token-count'

export const check_imported_files_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkImportedFiles',
    async (item: FileItem) => {
      if (!item) return

      const get_imports_for_uri = async (
        document_uri: vscode.Uri
      ): Promise<string[]> => {
        const found_uris = new Set<string>()
        try {
          const document = await vscode.workspace.openTextDocument(document_uri)
          const text = document.getText()
          const lines = text.split('\n')

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (/^\s*(import|from|require|include|using|use)\b/.test(line)) {
              const matches = [...line.matchAll(/["']([^"']+)["']/g)]
              if (matches.length > 0) {
                for (const match of matches) {
                  const position = new vscode.Position(i, match.index! + 1)
                  try {
                    const definitions = await vscode.commands.executeCommand<
                      vscode.Location[] | vscode.LocationLink[]
                    >(
                      'vscode.executeDefinitionProvider',
                      document.uri,
                      position
                    )
                    if (definitions) {
                      for (const def of definitions) {
                        const uri = 'uri' in def ? def.uri : def.targetUri
                        if (uri.scheme == 'file') found_uris.add(uri.toString())
                      }
                    }
                  } catch {}
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
                  const position = new vscode.Position(
                    i,
                    word.index! + Math.floor(word[0].length / 2)
                  )
                  try {
                    const definitions = await vscode.commands.executeCommand<
                      vscode.Location[] | vscode.LocationLink[]
                    >(
                      'vscode.executeDefinitionProvider',
                      document.uri,
                      position
                    )
                    if (definitions) {
                      for (const def of definitions) {
                        const uri = 'uri' in def ? def.uri : def.targetUri
                        if (uri.scheme == 'file') found_uris.add(uri.toString())
                      }
                    }
                  } catch {}
                }
              }
            }
          }
        } catch {}
        return Array.from(found_uris)
      }

      const immediate_uris = new Set<string>()
      const recursive_uris = new Set<string>()
      const visited_uris = new Set<string>([item.resourceUri.toString()])

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

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'Checking imported files...'
        },
        async () => {
          const immediate = await get_imports_for_uri(item.resourceUri)
          const queue: vscode.Uri[] = []

          for (const uri_str of immediate) {
            if (!visited_uris.has(uri_str)) {
              visited_uris.add(uri_str)
              if (is_valid_uri(uri_str)) {
                immediate_uris.add(uri_str)
                queue.push(vscode.Uri.parse(uri_str))
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
        vscode.window.showInformationMessage(
          'No imported files found to check in the workspace.'
        )
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
      quick_pick.placeholder = 'Select imported files to check'
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
      const selected_uris = new Set(
        valid_selected.map((item) => item.uri!.toString())
      )

      for (const item of quick_pick_items) {
        if (item.kind === vscode.QuickPickItemKind.Separator || !item.uri)
          continue
        const is_selected = selected_uris.has(item.uri.toString())

        if (is_selected !== item.picked) {
          const state = is_selected
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked

          const file_item = new FileItem(
            path.basename(item.uri.fsPath),
            item.uri,
            vscode.TreeItemCollapsibleState.None,
            false,
            state,
            false,
            false,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false
          )

          await workspace_provider.update_check_state(file_item, state)
        }
      }
    }
  )
}
