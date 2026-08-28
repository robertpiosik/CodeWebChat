import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { display_token_count } from '@shared/utils/display-token-count'
import { t } from '@/i18n'
import { Logger } from '@shared/utils/logger'
import { extract_paths_from_text } from '@/utils/extract-paths-from-text'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'

export const select_clipboard_paths_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectClipboardPaths',
    async () => {
      try {
        const text = await vscode.env.clipboard.readText()
        if (!text || !text.trim()) {
          vscode.window.showInformationMessage('Clipboard is empty.')
          return
        }

        const workspace_roots = workspace_provider.get_workspace_roots()

        if (workspace_roots.length === 0) {
          vscode.window.showInformationMessage('No workspace is open.')
          return
        }

        const all_workspace_files = await get_all_workspace_files({
          workspace_provider
        })

        const workspaces_with_paths: {
          root: string
          name: string
          absolute_paths: string[]
        }[] = []

        for (const root of workspace_roots) {
          let workspace_files = all_workspace_files
          let prefix = ''

          if (workspace_roots.length > 1) {
            const workspace_name = workspace_provider.get_workspace_name(root)
            prefix = `${workspace_name}/`

            const root_files = workspace_files.filter((f) =>
              f.startsWith(prefix)
            )
            const stripped_files = root_files.map((f) =>
              f.substring(prefix.length)
            )

            workspace_files = [...root_files, ...stripped_files]
          }

          const valid_paths = extract_paths_from_text({
            text,
            workspace_files
          })

          const absolute_paths = Array.from(
            new Set(
              valid_paths.map((p) => {
                const relative_path =
                  prefix && p.startsWith(prefix)
                    ? p.substring(prefix.length)
                    : p
                return path.join(root, relative_path)
              })
            )
          ).filter((p) => fs.existsSync(p))

          if (absolute_paths.length > 0) {
            workspaces_with_paths.push({
              root,
              name: workspace_provider.get_workspace_name(root),
              absolute_paths
            })
          }
        }

        if (workspaces_with_paths.length === 0) {
          vscode.window.showInformationMessage(
            t('command.select-clipboard-paths.no-valid')
          )
          return
        }

        let current_step: 'select_workspace' | 'select_files' | 'finish' =
          workspaces_with_paths.length > 1 ? 'select_workspace' : 'select_files'

        let absolute_paths: string[] = []
        const final_selected_paths: string[] = []
        let accumulated_checked = workspace_provider.get_checked_files()
        let has_updates = false

        while (current_step !== 'finish') {
          if (current_step === 'select_workspace') {
            const quick_pick_items = workspaces_with_paths.map((ws) => ({
              label: ws.name,
              description: `${ws.absolute_paths.length} · ${ws.root}`,
              root: ws.root,
              absolute_paths: ws.absolute_paths
            }))

            const quick_pick = vscode.window.createQuickPick<
              vscode.QuickPickItem & {
                root: string
                absolute_paths: string[]
              }
            >()
            quick_pick.title = 'Workspaces'
            quick_pick.placeholder = 'Select workspace for clipboard paths'
            quick_pick.items = quick_pick_items

            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: t('common.close')
            }
            quick_pick.buttons = [close_button]

            const selected_workspace = await new Promise<
              | (vscode.QuickPickItem & {
                  root: string
                  absolute_paths: string[]
                })
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
                resolve(quick_pick.selectedItems[0])
                quick_pick.hide()
              })

              quick_pick.onDidHide(() => {
                if (!is_accepted) {
                  resolve(undefined)
                }
                quick_pick.dispose()
              })

              quick_pick.show()
            })

            if (!selected_workspace) {
              current_step = 'finish'
              break
            }

            absolute_paths = selected_workspace.absolute_paths
            current_step = 'select_files'
          } else if (current_step === 'select_files') {
            if (workspaces_with_paths.length === 1) {
              absolute_paths = workspaces_with_paths[0].absolute_paths
            }

            const currently_checked = accumulated_checked
            const currently_checked_set = new Set(currently_checked)

            const quick_pick_items: (vscode.QuickPickItem & {
              file_path: string
            })[] = await Promise.all(
              absolute_paths.map(async (file_path) => {
                const token_count =
                  await workspace_provider.calculate_file_tokens(file_path)

                const formatted_token_count = display_token_count(
                  token_count.total
                )

                const root =
                  workspace_provider.get_workspace_root_for_file(file_path)
                const relative_path = root
                  ? path.relative(root, file_path)
                  : file_path
                const dir_name = path.dirname(relative_path)
                let display_dir = dir_name === '.' ? '' : dir_name

                if (root && workspace_roots.length > 1) {
                  const workspace_name =
                    workspace_provider.get_workspace_name(root)
                  display_dir = display_dir
                    ? `${workspace_name}/${display_dir}`
                    : workspace_name
                }

                return {
                  label: path.basename(file_path),
                  description: display_dir
                    ? `${formatted_token_count} · ${display_dir}`
                    : formatted_token_count,
                  file_path,
                  token_count: token_count.total,
                  buttons: [
                    {
                      iconPath: new vscode.ThemeIcon('go-to-file'),
                      tooltip: t('common.go-to-file')
                    }
                  ]
                }
              })
            )

            let current_selected_items = quick_pick_items.filter((item) =>
              currently_checked_set.has(item.file_path)
            )

            let should_go_back_to_workspace = false

            while (true) {
              const quick_pick = vscode.window.createQuickPick<
                vscode.QuickPickItem & { file_path: string }
              >()

              quick_pick.title = t('command.select-clipboard-paths.title')

              const base_placeholder = t(
                'command.select-clipboard-paths.include'
              )

              const update_title = () => {
                const total = quick_pick.selectedItems.reduce(
                  (sum, item) => sum + ((item as any).token_count || 0),
                  0
                )
                const total_text =
                  total > 0
                    ? ` (${t('common.totalling-tokens', {
                        tokens: display_token_count(total)
                      })})`
                    : ''
                quick_pick.placeholder = `${base_placeholder}${total_text}`
              }

              quick_pick.canSelectMany = true
              quick_pick.items = quick_pick_items
              quick_pick.ignoreFocusOut = true
              quick_pick.selectedItems = current_selected_items

              update_title()
              quick_pick.onDidChangeSelection(update_title)

              const close_button = {
                iconPath: new vscode.ThemeIcon('close'),
                tooltip: t('common.close')
              }
              const search_button = {
                iconPath: new vscode.ThemeIcon('search'),
                tooltip: t('common.search-in-selected-results')
              }

              quick_pick.buttons = [
                ...(workspaces_with_paths.length > 1
                  ? [vscode.QuickInputButtons.Back]
                  : []),
                search_button,
                close_button
              ]

              const selected_items = await new Promise<
                | readonly (vscode.QuickPickItem & { file_path: string })[]
                | undefined
                | 'search'
                | 'back'
              >((resolve) => {
                let is_accepted = false

                quick_pick.onDidTriggerButton((button) => {
                  if (button === vscode.QuickInputButtons.Back) {
                    resolve('back')
                    quick_pick.hide()
                  } else if (button === close_button) {
                    resolve(undefined)
                    quick_pick.hide()
                  } else if (button === search_button) {
                    current_selected_items = [...quick_pick.selectedItems]
                    resolve('search')
                    quick_pick.hide()
                  }
                })

                quick_pick.onDidTriggerItemButton(async (e) => {
                  if (e.button.tooltip === t('common.go-to-file')) {
                    const uri = vscode.Uri.file(e.item.file_path)
                    vscode.window.showTextDocument(uri, { preview: true })
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

                quick_pick.show()
              })

              if (selected_items === 'back') {
                should_go_back_to_workspace = true
                break
              }

              if (!selected_items) {
                current_step = 'finish'
                break
              }

              if (
                Array.isArray(selected_items) &&
                selected_items.length === 0
              ) {
                break
              }

              let selected_paths: string[] = []

              if (selected_items === 'search') {
                const search_result = await search_files({
                  get_files: async () =>
                    current_selected_items.map((i) => i.file_path),
                  workspace_provider,
                  extension_context,
                  websocket_manager,
                  show_back_button: true
                })

                if (search_result === 'back') {
                  continue
                }

                if (!search_result) {
                  current_step = 'finish'
                  break
                }

                selected_paths = search_result.selected_paths
              } else {
                selected_paths = selected_items.map((item) => item.file_path)
              }

              if (selected_paths.length === 0) {
                break
              }

              final_selected_paths.push(...selected_paths)

              if (currently_checked.length > 0) {
                const selected_paths_set = new Set(selected_paths)
                const is_identical =
                  currently_checked.length === selected_paths_set.size &&
                  currently_checked.every((file) =>
                    selected_paths_set.has(file)
                  )

                if (is_identical) {
                  vscode.window.showInformationMessage(
                    t('common.info.context-already-set')
                  )
                  break
                }
              }

              accumulated_checked = [
                ...new Set([...currently_checked, ...selected_paths])
              ]
              has_updates = true

              break
            }

            if (current_step === 'finish') {
              break
            }

            if (should_go_back_to_workspace) {
              current_step = 'select_workspace'
            } else if (workspaces_with_paths.length > 1) {
              current_step = 'select_workspace'
            } else {
              current_step = 'finish'
            }
          }
        }

        if (has_updates) {
          await workspace_provider.set_checked_files(accumulated_checked)

          vscode.window.showInformationMessage(
            t('common.success.context-updated')
          )
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to select clipboard paths: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        Logger.error({
          function_name: 'select_clipboard_paths_command',
          message: 'Error handling clipboard paths command',
          data: error
        })
      }
    }
  )
}
