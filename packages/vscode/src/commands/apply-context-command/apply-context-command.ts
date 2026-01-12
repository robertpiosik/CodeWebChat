import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import {
  LAST_APPLY_CONTEXT_OPTION_STATE_KEY,
  QUICK_SAVES_STATE_KEY
} from '../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { dictionary } from '@shared/constants/dictionary'
import {
  handle_unstaged_files_source,
  handle_json_file_source,
  handle_workspace_state_source,
  handle_commit_files_source
} from './sources'
import {
  load_all_contexts,
  get_contexts_file_path,
  load_and_merge_global_contexts
} from './helpers/saving'
import { handle_quick_save } from './helpers/saving/handle-quick-save'

export const apply_context_command = (
  workspace_provider: WorkspaceProvider | undefined,
  on_context_selected: () => void,
  extension_context: vscode.ExtensionContext
): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.applyContext',
    async () => {
      let show_main_menu = true
      let last_main_selection_value = extension_context.workspaceState.get<
        'internal' | 'file' | 'other' | string | undefined
      >(LAST_APPLY_CONTEXT_OPTION_STATE_KEY)

      while (show_main_menu) {
        show_main_menu = false

        if (!workspace_provider) {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_PROVIDER
          )
          return
        }

        // Load merged contexts for display count
        const { merged: internal_contexts } =
          load_and_merge_global_contexts(extension_context)

        const file_contexts_map = await load_all_contexts()
        let file_contexts_count = 0
        for (const info of file_contexts_map.values()) {
          file_contexts_count += info.contexts.length
        }

        const main_quick_pick_options: (vscode.QuickPickItem & {
          value: 'internal' | 'file' | 'other' | string
        })[] = []

        main_quick_pick_options.push({
          label: 'Workspace state',
          description: `${internal_contexts.length} ${
            internal_contexts.length == 1 ? 'entry' : 'entries'
          }`,
          value: 'internal'
        })

        const open_file_button = {
          iconPath: new vscode.ThemeIcon('file'),
          tooltip: 'Open the file'
        }

        main_quick_pick_options.push({
          label: 'JSON file',
          description: `${file_contexts_count} ${
            file_contexts_count == 1 ? 'entry' : 'entries'
          }`,
          value: 'file',
          buttons: [open_file_button]
        })

        main_quick_pick_options.push({
          label: 'Other...',
          value: 'other'
        })

        main_quick_pick_options.push({
          label: 'quick saves',
          kind: vscode.QuickPickItemKind.Separator,
          value: 'separator'
        } as any)

        const quick_saves = extension_context.workspaceState.get<
          Record<number, SavedContext>
        >(QUICK_SAVES_STATE_KEY, {})
        for (let i = 1; i <= 3; i++) {
          const is_saved = !!quick_saves[i]
          main_quick_pick_options.push({
            label: `Quick save slot ${i}`,
            description: is_saved
              ? `${quick_saves[i].paths.length} paths`
              : 'empty',
            value: `quick_save_${i}`,
            buttons: is_saved
              ? [{ iconPath: new vscode.ThemeIcon('trash'), tooltip: 'Clear' }]
              : []
          })
        }

        const main_quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & {
            value: 'internal' | 'file' | 'other' | string
          }
        >()
        main_quick_pick.title = 'Context Sources'
        main_quick_pick.items = main_quick_pick_options
        main_quick_pick.placeholder = 'Select option'
        main_quick_pick.buttons = [
          { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
        ]
        if (last_main_selection_value) {
          const active_item = main_quick_pick_options.find(
            (opt) => opt.value === last_main_selection_value
          )
          if (active_item) {
            main_quick_pick.activeItems = [active_item]
          }
        }

        const main_selection = await new Promise<
          | (vscode.QuickPickItem & {
              value: 'internal' | 'file' | 'other' | string
              triggeredButton?: vscode.QuickInputButton
            })
          | undefined
        >((resolve) => {
          let is_accepted = false
          const disposables: vscode.Disposable[] = []
          disposables.push(
            main_quick_pick.onDidTriggerButton((_button) => {
              main_quick_pick.hide()
            }),
            main_quick_pick.onDidTriggerItemButton(async (e) => {
              if (e.button === open_file_button) {
                const workspace_folders = vscode.workspace.workspaceFolders
                if (!workspace_folders || workspace_folders.length == 0) {
                  return
                }

                let file_path: string | undefined

                if (workspace_folders.length == 1) {
                  file_path = get_contexts_file_path(
                    workspace_folders[0].uri.fsPath
                  )
                } else {
                  const picked = await vscode.window.showQuickPick(
                    workspace_folders.map((f) => ({
                      label: f.name,
                      description: f.uri.fsPath,
                      folder: f
                    })),
                    { placeHolder: 'Select workspace folder' }
                  )
                  if (picked) {
                    file_path = get_contexts_file_path(picked.folder.uri.fsPath)
                  }
                }

                if (file_path) {
                  if (!fs.existsSync(file_path)) {
                    try {
                      const dir = path.dirname(file_path)
                      if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true })
                      }
                      fs.writeFileSync(file_path, '[]', 'utf8')
                    } catch (error) {
                      vscode.window.showErrorMessage(
                        `Failed to create context file: ${error}`
                      )
                      return
                    }
                  }
                  const doc = await vscode.workspace.openTextDocument(file_path)
                  await vscode.window.showTextDocument(doc)
                  main_quick_pick.hide()
                }
              }
            }),
            main_quick_pick.onDidTriggerItemButton(async (e) => {
              if (e.item.value.startsWith('quick_save_')) {
                const slot = parseInt(e.item.value.split('_')[2])
                const current = extension_context.workspaceState.get<
                  Record<number, SavedContext>
                >(QUICK_SAVES_STATE_KEY, {})
                delete current[slot]
                await extension_context.workspaceState.update(
                  QUICK_SAVES_STATE_KEY,
                  current
                )
                resolve({ ...e.item, triggeredButton: e.button })
              }
            }),
            main_quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(main_quick_pick.selectedItems[0])
              main_quick_pick.hide()
            }),
            main_quick_pick.onDidHide(() => {
              if (!is_accepted) {
                resolve(undefined)
              }
              disposables.forEach((d) => d.dispose())
              main_quick_pick.dispose()
            })
          )
          main_quick_pick.show()
        })

        if (!main_selection) return

        if (main_selection.triggeredButton) {
          show_main_menu = true
          continue
        }

        last_main_selection_value = main_selection.value
        await extension_context.workspaceState.update(
          LAST_APPLY_CONTEXT_OPTION_STATE_KEY,
          last_main_selection_value
        )

        if (main_selection.value == 'internal') {
          const result = await handle_workspace_state_source(
            workspace_provider,
            extension_context,
            on_context_selected
          )
          if (result == 'back') {
            show_main_menu = true
          }
        } else if (main_selection.value == 'file') {
          const result = await handle_json_file_source(
            workspace_provider,
            extension_context,
            on_context_selected
          )
          if (result == 'back') {
            show_main_menu = true
          }
        } else if (main_selection.value == 'other') {
          let show_other_menu = true
          let last_other_selection_value: string | undefined

          while (show_other_menu) {
            show_other_menu = false

            const other_quick_pick_options: (vscode.QuickPickItem & {
              value?: 'clipboard' | 'unstaged' | 'commit_files'
            })[] = [
              {
                label: 'Scan the clipboard for valid paths',
                value: 'clipboard'
              },
              {
                label: 'Unstaged files',
                value: 'unstaged'
              },
              {
                label: 'Files of a commit...',
                value: 'commit_files'
              }
            ]

            const other_quick_pick = vscode.window.createQuickPick<
              vscode.QuickPickItem & {
                value?: 'clipboard' | 'unstaged' | 'commit_files'
              }
            >()
            other_quick_pick.title = 'Context Sources'
            other_quick_pick.items = other_quick_pick_options
            other_quick_pick.placeholder = 'Select other option'
            other_quick_pick.buttons = [vscode.QuickInputButtons.Back]

            if (last_other_selection_value) {
              const active_item = other_quick_pick_options.find(
                (opt) => opt.value === last_other_selection_value
              )
              if (active_item) {
                other_quick_pick.activeItems = [active_item]
              }
            }

            const other_selection = await new Promise<
              | 'back'
              | (vscode.QuickPickItem & {
                  value?: 'clipboard' | 'unstaged' | 'commit_files'
                })
              | undefined
            >((resolve) => {
              let is_accepted = false
              let did_trigger_back = false
              const disposables: vscode.Disposable[] = []

              disposables.push(
                other_quick_pick.onDidTriggerButton((button) => {
                  if (button === vscode.QuickInputButtons.Back) {
                    did_trigger_back = true
                    other_quick_pick.hide()
                    resolve('back')
                  }
                }),
                other_quick_pick.onDidAccept(() => {
                  is_accepted = true
                  resolve(other_quick_pick.selectedItems[0])
                  other_quick_pick.hide()
                }),
                other_quick_pick.onDidHide(() => {
                  if (!is_accepted && !did_trigger_back) {
                    resolve('back')
                  }
                  disposables.forEach((d) => d.dispose())
                  other_quick_pick.dispose()
                })
              )
              other_quick_pick.show()
            })

            if (!other_selection || other_selection == 'back') {
              show_main_menu = true
              break
            }

            last_other_selection_value = other_selection.value

            if (other_selection.value == 'clipboard') {
              await vscode.commands.executeCommand(
                'codeWebChat.findPathsInClipboard'
              )
              return
            }
            if (other_selection.value == 'unstaged') {
              await handle_unstaged_files_source(workspace_provider)
              return
            }
            if (other_selection.value == 'commit_files') {
              const result = await handle_commit_files_source(
                workspace_provider,
                extension_context
              )
              if (result === 'back') {
                show_other_menu = true
                continue
              }
              return
            }
          }
        } else if (main_selection.value.startsWith('quick_save_')) {
          const slot = parseInt(main_selection.value.split('_')[2])
          await handle_quick_save(
            slot,
            workspace_provider,
            extension_context,
            on_context_selected
          )
        }
      }
    }
  )
}
