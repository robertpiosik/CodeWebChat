import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_APPLY_CONTEXT_OPTION_STATE_KEY
} from '../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { dictionary } from '@shared/constants/dictionary'
import { handle_unstaged_files_source } from './sources'
import { resolve_paths } from './helpers/applying'
import {
  ask_for_new_context_name,
  group_files_by_workspace,
  condense_paths,
  add_workspace_prefix,
  get_contexts_file_path,
  load_all_contexts,
  save_contexts_to_file
} from './helpers/saving'

const LABEL_NEW_ENTRY = '$(add) New entry...'

export function apply_context_command(
  workspace_provider: WorkspaceProvider | undefined,
  on_context_selected: () => void,
  extension_context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'codeWebChat.applyContext',
    async () => {
      let show_main_menu = true
      let last_main_selection_value = extension_context.workspaceState.get<
        'internal' | 'file' | 'other' | undefined
      >(LAST_APPLY_CONTEXT_OPTION_STATE_KEY)

      while (show_main_menu) {
        show_main_menu = false

        if (!workspace_provider) {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_PROVIDER
          )
          return
        }

        const workspace_root = workspace_provider.getWorkspaceRoot()
        if (!workspace_root) {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_ROOT
          )
          return
        }

        const internal_contexts: SavedContext[] =
          extension_context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, [])

        const file_contexts_map = await load_all_contexts()
        let file_contexts_count = 0
        for (const info of file_contexts_map.values()) {
          file_contexts_count += info.contexts.length
        }

        const main_quick_pick_options: (vscode.QuickPickItem & {
          value: 'internal' | 'file' | 'other'
        })[] = []

        main_quick_pick_options.push({
          label: 'Workspace state',
          description: `${internal_contexts.length} ${
            internal_contexts.length === 1 ? 'context' : 'contexts'
          }`,
          value: 'internal'
        })

        main_quick_pick_options.push({
          label: 'JSON file',
          description: `${file_contexts_count} ${
            file_contexts_count === 1 ? 'context' : 'contexts'
          }`,
          value: 'file'
        })

        main_quick_pick_options.push({
          label: 'Other...',
          value: 'other'
        })

        const main_quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { value: 'internal' | 'file' | 'other' }
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
              value: 'internal' | 'file' | 'other'
            })
          | undefined
        >((resolve) => {
          let is_accepted = false
          const disposables: vscode.Disposable[] = []
          disposables.push(
            main_quick_pick.onDidTriggerButton((_button) => {
              main_quick_pick.hide()
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

        last_main_selection_value = main_selection.value
        await extension_context.workspaceState.update(
          LAST_APPLY_CONTEXT_OPTION_STATE_KEY,
          last_main_selection_value
        )

        if (main_selection.value == 'internal') {
          const result = await handle_internal_source(
            workspace_provider,
            extension_context,
            on_context_selected
          )
          if (result == 'back') {
            show_main_menu = true
          }
        } else if (main_selection.value == 'file') {
          const result = await handle_file_source(
            workspace_provider,
            on_context_selected
          )
          if (result == 'back') {
            show_main_menu = true
          }
        } else if (main_selection.value == 'other') {
          const other_quick_pick_options: (vscode.QuickPickItem & {
            value?: 'clipboard' | 'unstaged'
          })[] = [
            {
              label: 'Scan the clipboard for valid paths',
              value: 'clipboard'
            },
            {
              label: 'Select unstaged files',
              value: 'unstaged'
            }
          ]

          const other_quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { value?: 'clipboard' | 'unstaged' }
          >()
          other_quick_pick.title = 'Context Sources'
          other_quick_pick.items = other_quick_pick_options
          other_quick_pick.placeholder = 'Select other option'
          other_quick_pick.buttons = [vscode.QuickInputButtons.Back]

          const other_selection = await new Promise<
            | 'back'
            | (vscode.QuickPickItem & { value?: 'clipboard' | 'unstaged' })
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
            continue
          }

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
        }
      }
    }
  )
}

async function handle_internal_source(
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  on_context_selected: () => void
): Promise<'back' | void> {
  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: 'Delete'
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let saved_contexts: SavedContext[] = extension_context.workspaceState.get(
      SAVED_CONTEXTS_STATE_KEY,
      []
    )

    const create_items = () => {
      const items: vscode.QuickPickItem[] = []
      items.push({ label: LABEL_NEW_ENTRY })

      if (saved_contexts.length > 0) {
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator })
        saved_contexts.forEach((context) => {
          items.push({
            label: context.name,
            description: `${context.paths.length} ${
              context.paths.length === 1 ? 'path' : 'paths'
            }`,
            buttons: [delete_button]
          })
        })
      }
      return items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.title = 'Workspace State Contexts'
    quick_pick.placeholder = 'Select a context to apply or create a new one'
    quick_pick.items = create_items()
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const selection = await new Promise<
      vscode.QuickPickItem | 'back' | undefined
    >((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            quick_pick.hide()
            resolve('back')
          }
        }),
        quick_pick.onDidTriggerItemButton(async (event) => {
          const deleted_context_name = event.item.label
          const original_contexts = [...saved_contexts]
          const updated_contexts = saved_contexts.filter(
            (c) => c.name !== deleted_context_name
          )

          await extension_context.workspaceState.update(
            SAVED_CONTEXTS_STATE_KEY,
            updated_contexts
          )
          saved_contexts =
            extension_context.workspaceState.get(
              SAVED_CONTEXTS_STATE_KEY,
              []
            ) || []
          quick_pick.items = create_items()

          vscode.window
            .showInformationMessage(
              dictionary.information_message
                .DELETED_CONTEXT_FROM_WORKSPACE_STATE,
              'Undo'
            )
            .then(async (choice) => {
              if (choice == 'Undo') {
                await extension_context.workspaceState.update(
                  SAVED_CONTEXTS_STATE_KEY,
                  original_contexts
                )
                saved_contexts =
                  extension_context.workspaceState.get(
                    SAVED_CONTEXTS_STATE_KEY,
                    []
                  ) || []
                // This might not update the quick pick if it's already closed or changed,
                // but since we are in a loop, it will be updated next render if user is still here.
                // If quick pick is still open:
                quick_pick.items = create_items()
                vscode.window.showInformationMessage(
                  dictionary.information_message.RESTORED_CONTEXT(
                    deleted_context_name
                  )
                )
              }
            })
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve('back')
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (!selection) return // dismissed
    if (selection == 'back') return 'back'

    if (selection.label === LABEL_NEW_ENTRY) {
      // Create new context logic
      const checked_files = workspace_provider.get_checked_files()
      if (checked_files.length === 0) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.NOTHING_IN_CONTEXT_TO_SAVE
        )
        continue
      }

      const name = await ask_for_new_context_name(true)
      if (!name || name == 'back') continue

      const files_by_workspace = group_files_by_workspace(checked_files)

      let all_prefixed_paths: string[] = []

      for (const [root, files] of files_by_workspace.entries()) {
        if (files.length === 0) continue
        const condensed_paths = condense_paths(files, root, workspace_provider)
        const relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))
        const prefixed_paths = add_workspace_prefix(relative_paths, root)
        all_prefixed_paths = [...all_prefixed_paths, ...prefixed_paths]
      }

      // Sort paths
      all_prefixed_paths.sort((a, b) => a.localeCompare(b))

      // Check overwrite
      const existing_index = saved_contexts.findIndex((c) => c.name === name)
      if (existing_index !== -1) {
        const overwrite = await vscode.window.showWarningMessage(
          dictionary.warning_message.CONFIRM_OVERWRITE_CONTEXT_IN_WORKSPACE_STATE(
            name
          ),
          { modal: true },
          'Overwrite'
        )
        if (overwrite !== 'Overwrite') continue
      }

      const new_context: SavedContext = {
        name,
        paths: all_prefixed_paths
      }

      const updated_contexts = [...saved_contexts]
      if (existing_index !== -1) {
        updated_contexts[existing_index] = new_context
      } else {
        updated_contexts.push(new_context)
      }
      updated_contexts.sort((a, b) => a.name.localeCompare(b.name))

      await extension_context.workspaceState.update(
        SAVED_CONTEXTS_STATE_KEY,
        updated_contexts
      )
      vscode.window.showInformationMessage(
        dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
      )
      // Loop continues to show updated list
    } else {
      // Apply existing context
      const context = saved_contexts.find((c) => c.name === selection.label)
      if (context) {
        const workspace_roots = workspace_provider.getWorkspaceRoots()
        // We need names for prefix resolution
        const workspace_names =
          vscode.workspace.workspaceFolders?.map((f) => f.name) || []

        const resolved_paths = resolve_paths(
          context.paths,
          workspace_roots,
          workspace_names
        )

        await workspace_provider.set_checked_files(resolved_paths)
        on_context_selected()
        return // Done
      }
    }
  }
}

async function handle_file_source(
  workspace_provider: WorkspaceProvider,
  on_context_selected: () => void
): Promise<'back' | void> {
  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: 'Delete'
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let contexts_map = await load_all_contexts()

    const create_items = () => {
      const items: vscode.QuickPickItem[] = []
      items.push({ label: LABEL_NEW_ENTRY })

      if (contexts_map.size > 0) {
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator })
        const names = Array.from(contexts_map.keys()).sort()

        for (const name of names) {
          const context_info = contexts_map.get(name)!
          const roots_with_context = context_info.contexts.map(
            (c) => (c as any)._root
          )
          const workspace_names = roots_with_context.map((root) => {
            const folder = vscode.workspace.workspaceFolders?.find(
              (f) => f.uri.fsPath === root
            )
            return folder?.name || path.basename(root)
          })

          const total_paths = context_info.contexts.reduce(
            (sum, c) => sum + c.paths.length,
            0
          )

          items.push({
            label: name,
            description:
              workspace_names.length > 1
                ? `${total_paths} paths · ${workspace_names.join(', ')}`
                : `${total_paths} paths`,
            buttons: [delete_button]
          })
        }
      }
      return items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.title = 'JSON File Contexts'
    quick_pick.placeholder = 'Select a context to apply or create a new one'
    quick_pick.items = create_items()
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const selection = await new Promise<
      vscode.QuickPickItem | 'back' | undefined
    >((resolve) => {
      let is_accepted = false
      let did_trigger_back = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            did_trigger_back = true
            quick_pick.hide()
            resolve('back')
          }
        }),
        quick_pick.onDidTriggerItemButton(async (event) => {
          const deleted_context_name = event.item.label
          const context_info = contexts_map.get(deleted_context_name)
          if (!context_info) return

          const roots = context_info.contexts.map((c) => (c as any)._root)
          const unique_roots = [...new Set(roots)]
          const original_file_contents = new Map<string, string>()

          for (const root of unique_roots) {
            const file_path = get_contexts_file_path(root)
            if (fs.existsSync(file_path)) {
              original_file_contents.set(
                file_path,
                fs.readFileSync(file_path, 'utf8')
              )
            }
          }

          for (const root of unique_roots) {
            const file_path = get_contexts_file_path(root)
            try {
              if (fs.existsSync(file_path)) {
                const content = fs.readFileSync(file_path, 'utf8')
                let root_contexts = JSON.parse(content)
                if (!Array.isArray(root_contexts)) root_contexts = []
                root_contexts = root_contexts.filter(
                  (c: SavedContext) => c.name !== deleted_context_name
                )
                await save_contexts_to_file(root_contexts, file_path)
              }
            } catch (error: any) {
              vscode.window.showErrorMessage(
                dictionary.error_message.ERROR_DELETING_CONTEXT_FROM_FILE(
                  error.message
                )
              )
            }
          }

          contexts_map = await load_all_contexts()
          quick_pick.items = create_items()

          vscode.window
            .showInformationMessage(
              dictionary.information_message.DELETED_CONTEXT_FROM_ALL_ROOTS,
              'Undo'
            )
            .then(async (choice) => {
              if (choice == 'Undo') {
                for (const [
                  file_path,
                  content
                ] of original_file_contents.entries()) {
                  try {
                    fs.writeFileSync(file_path, content, 'utf8')
                  } catch (error: any) {
                    vscode.window.showErrorMessage(
                      dictionary.error_message.FAILED_TO_UNDO_CHANGES(
                        `Failed to restore context in ${file_path}: ${error.message}`
                      )
                    )
                  }
                }
                contexts_map = await load_all_contexts()
                quick_pick.items = create_items()
                vscode.window.showInformationMessage(
                  dictionary.information_message.RESTORED_CONTEXT(
                    deleted_context_name
                  )
                )
              }
            })
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          resolve(quick_pick.selectedItems[0])
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted && !did_trigger_back) {
            resolve('back')
          }
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )
      quick_pick.show()
    })

    if (!selection) return // dismissed
    if (selection == 'back') return 'back'

    if (selection.label === LABEL_NEW_ENTRY) {
      // Create new file context
      const checked_files = workspace_provider.get_checked_files()
      if (checked_files.length === 0) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.NOTHING_IN_CONTEXT_TO_SAVE
        )
        continue
      }

      const name = await ask_for_new_context_name(true)
      if (!name || name == 'back') continue

      if (contexts_map.has(name)) {
        const overwrite = await vscode.window.showWarningMessage(
          dictionary.warning_message.CONFIRM_OVERWRITE_CONTEXT(name),
          { modal: true },
          'Overwrite'
        )
        if (overwrite !== 'Overwrite') continue
      }

      const files_by_workspace = group_files_by_workspace(checked_files)

      for (const [root, files] of files_by_workspace.entries()) {
        if (files.length === 0) continue

        const contexts_file_path = get_contexts_file_path(root)
        const vscode_dir = path.dirname(contexts_file_path)
        if (!fs.existsSync(vscode_dir)) {
          fs.mkdirSync(vscode_dir, { recursive: true })
        }

        let file_contexts: SavedContext[] = []
        if (fs.existsSync(contexts_file_path)) {
          try {
            const content = fs.readFileSync(contexts_file_path, 'utf8')
            if (content.trim().length > 0) {
              file_contexts = JSON.parse(content)
              if (!Array.isArray(file_contexts)) file_contexts = []
            }
          } catch {
            file_contexts = []
          }
        }

        const condensed_paths = condense_paths(files, root, workspace_provider)
        const relative_paths = condensed_paths.map((p) => p.replace(/\\/g, '/'))

        const new_context: SavedContext = {
          name,
          paths: relative_paths
        }

        const existing_index = file_contexts.findIndex((c) => c.name === name)
        if (existing_index !== -1) {
          file_contexts[existing_index] = new_context
        } else {
          file_contexts.push(new_context)
        }
        file_contexts.sort((a, b) => a.name.localeCompare(b.name))

        fs.writeFileSync(
          contexts_file_path,
          JSON.stringify(file_contexts, null, 2),
          'utf8'
        )
      }

      vscode.window.showInformationMessage(
        dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
      )
      // Loop continues
    } else {
      // Apply existing file context
      const context_info = contexts_map.get(selection.label)
      if (context_info) {
        const resolved_paths: string[] = []
        for (const ctx of context_info.contexts) {
          const root = (ctx as any)._root
          if (root) {
            resolved_paths.push(
              ...resolve_paths(ctx.paths, [], [], root) // Resolve relative to specific root
            )
          }
        }

        await workspace_provider.set_checked_files(resolved_paths)
        on_context_selected()
        return // Done
      }
    }
  }
}
