import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { apply_saved_context } from '../helpers/applying'
import {
  ask_for_new_context_name,
  group_files_by_workspace,
  condense_paths,
  resolve_unique_context_name,
  load_contexts_for_workspace,
  save_contexts_for_workspace,
  load_and_merge_global_contexts
} from '../helpers/saving'

const LABEL_NEW_ENTRY = '$(add) New entry...'

let active_deletion_timestamp: number | undefined

export const handle_workspace_state_source = async (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  on_context_selected: () => void
): Promise<'back' | void> => {
  try {
    const refresh_contexts = () => {
      return load_and_merge_global_contexts(extension_context)
    }

    let { merged: internal_contexts, context_to_roots } = refresh_contexts()

    const sync_button = {
      iconPath: new vscode.ThemeIcon('sync'),
      tooltip: 'Update with currently selected files'
    }

    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: 'Rename'
    }

    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: 'Delete'
    }

    while (true) {
      const create_quick_pick_items = (contexts: SavedContext[]) => {
        const items: (vscode.QuickPickItem & {
          context?: SavedContext
          buttons?: vscode.QuickInputButton[]
          index?: number
        })[] = []

        items.push({ label: LABEL_NEW_ENTRY })

        if (contexts.length > 0) {
          items.push({
            label: 'recent entries',
            kind: vscode.QuickPickItemKind.Separator
          })

          const is_multi_root =
            (vscode.workspace.workspaceFolders || []).length > 1

          contexts.forEach((context, index) => {
            const buttons = [sync_button, edit_button, delete_button]
            const roots = context_to_roots.get(context.name) || []
            let description = `${context.paths.length} path${
              context.paths.length == 1 ? '' : 's'
            }`

            if (roots.length > 0 && (roots.length > 1 || is_multi_root)) {
              const workspace_names = roots.map((root) => {
                const folder = vscode.workspace.getWorkspaceFolder(
                  vscode.Uri.file(root)
                )
                return folder?.name || 'unknown'
              })
              description += ` · ${workspace_names.join(', ')}`
            }

            items.push({
              label: context.name,
              description,
              context,
              buttons,
              index
            })
          })
        }
        return items
      }

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.title = 'Select Saved Context'
      quick_pick.items = create_quick_pick_items(internal_contexts)
      quick_pick.placeholder = `Select saved context (from workspace state)`
      quick_pick.buttons = [vscode.QuickInputButtons.Back]

      let active_dialog_count = 0
      let go_back_after_delete = false

      const quick_pick_promise = new Promise<
        | 'back'
        | (vscode.QuickPickItem & {
            context?: SavedContext
          })
        | undefined
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
          quick_pick.onDidAccept(async () => {
            const selectedItem = quick_pick
              .selectedItems[0] as vscode.QuickPickItem & {
              context?: SavedContext
            }

            if (selectedItem.label === LABEL_NEW_ENTRY) {
              const checked_files = workspace_provider.get_checked_files()
              if (checked_files.length == 0) {
                active_dialog_count++
                await vscode.window.showWarningMessage(
                  dictionary.warning_message.NOTHING_IN_CONTEXT_TO_SAVE
                )
                active_dialog_count--
                quick_pick.show()
                return
              }

              active_dialog_count++
              const name = await ask_for_new_context_name(true)
              active_dialog_count--

              if (!name || name == 'back') {
                quick_pick.show()
                return
              }

              const existing_names = internal_contexts.map((c) => c.name)
              const unique_name = resolve_unique_context_name(
                name,
                existing_names
              )

              const files_by_workspace = group_files_by_workspace(checked_files)

              for (const [root, files] of files_by_workspace.entries()) {
                if (files.length == 0) continue

                const condensed_paths = condense_paths(
                  files,
                  root,
                  workspace_provider
                )
                // Store relative paths without prefixes in the per-root storage
                const relative_paths = condensed_paths.map((p) =>
                  p.replace(/\\/g, '/')
                )

                const root_contexts = load_contexts_for_workspace(
                  extension_context,
                  root
                )
                root_contexts.unshift({
                  name: unique_name,
                  paths: relative_paths
                })
                save_contexts_for_workspace(
                  extension_context,
                  root,
                  root_contexts
                )
              }

              vscode.window.showInformationMessage(
                dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
              )

              const reloaded = refresh_contexts()
              internal_contexts = reloaded.merged
              context_to_roots = reloaded.context_to_roots
              quick_pick.items = create_quick_pick_items(internal_contexts)
              quick_pick.value = ''
              quick_pick.show()
              return
            }

            is_accepted = true
            quick_pick.hide()
            resolve(selectedItem)
          }),

          quick_pick.onDidHide(() => {
            if (active_dialog_count > 0) {
              return
            }
            if (go_back_after_delete) {
              resolve('back')
            } else if (!is_accepted && !did_trigger_back) {
              resolve('back')
            }
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          }),

          quick_pick.onDidTriggerItemButton(async (event) => {
            const item = event.item as vscode.QuickPickItem & {
              context: SavedContext
              index: number
            }

            if (event.button === sync_button) {
              const context = item.context
              const checked_files = workspace_provider.get_checked_files()
              const files_by_workspace = group_files_by_workspace(checked_files)

              const current_roots = context_to_roots.get(context.name) || []
              const all_roots = new Set([
                ...current_roots,
                ...files_by_workspace.keys()
              ])

              for (const root of all_roots) {
                let root_contexts = load_contexts_for_workspace(
                  extension_context,
                  root
                )
                // Remove existing for this name
                root_contexts = root_contexts.filter(
                  (c) => c.name !== context.name
                )

                const files = files_by_workspace.get(root)
                if (
                  (files && files.length > 0) ||
                  current_roots.includes(root)
                ) {
                  let relative_paths: string[] = []

                  if (files && files.length > 0) {
                    const condensed_paths = condense_paths(
                      files,
                      root,
                      workspace_provider
                    )
                    relative_paths = condensed_paths.map((p) =>
                      p.replace(/\\/g, '/')
                    )
                  }

                  root_contexts.unshift({
                    name: context.name,
                    paths: relative_paths
                  })
                }
                save_contexts_for_workspace(
                  extension_context,
                  root,
                  root_contexts
                )
              }

              vscode.window.showInformationMessage(
                dictionary.information_message.CONTEXT_SAVED_SUCCESSFULLY
              )
              const reloaded = refresh_contexts()
              internal_contexts = reloaded.merged
              context_to_roots = reloaded.context_to_roots
              quick_pick.items = create_quick_pick_items(internal_contexts)
              quick_pick.show()
              return
            }

            if (event.button === edit_button) {
              active_dialog_count++
              const input_box = vscode.window.createInputBox()
              input_box.title = 'Rename Context'
              input_box.prompt = 'Enter new name for context.'
              input_box.value = item.context.name

              const new_name = await new Promise<string | undefined | 'back'>(
                (resolve) => {
                  let accepted = false
                  const disposables: vscode.Disposable[] = []

                  const validate = (value: string): boolean => {
                    const trimmed_value = value.trim()
                    if (!trimmed_value) {
                      input_box.validationMessage = 'Name cannot be empty'
                      return false
                    }

                    const duplicate = internal_contexts.find(
                      (c) =>
                        c.name === trimmed_value && c.name !== item.context.name
                    )
                    if (duplicate) {
                      input_box.validationMessage =
                        'A context with this name already exists'
                      return false
                    }
                    input_box.validationMessage = ''
                    return true
                  }

                  disposables.push(
                    input_box.onDidChangeValue(validate),
                    input_box.onDidAccept(() => {
                      if (!validate(input_box.value)) return
                      accepted = true
                      resolve(input_box.value.trim())
                      input_box.hide()
                    }),
                    input_box.onDidHide(() => {
                      if (!accepted) {
                        resolve(undefined)
                      }
                      disposables.forEach((d) => d.dispose())
                      input_box.dispose()
                    })
                  )
                  input_box.show()
                }
              )
              active_dialog_count--

              let name_to_highlight = item.context.name

              if (new_name && new_name != 'back') {
                const trimmed_name = new_name
                if (trimmed_name != item.context.name) {
                  const roots = context_to_roots.get(item.context.name) || []
                  for (const root of roots) {
                    const root_contexts = load_contexts_for_workspace(
                      extension_context,
                      root
                    )
                    const updated = root_contexts.map((c) =>
                      c.name === item.context.name
                        ? { ...c, name: trimmed_name }
                        : c
                    )
                    save_contexts_for_workspace(
                      extension_context,
                      root,
                      updated
                    )
                  }

                  name_to_highlight = trimmed_name
                  const reloaded = refresh_contexts()
                  internal_contexts = reloaded.merged
                  context_to_roots = reloaded.context_to_roots
                }
              }

              quick_pick.items = create_quick_pick_items(internal_contexts)
              const active_item = quick_pick.items.find(
                (i) => i.label == name_to_highlight
              )
              if (active_item) {
                quick_pick.activeItems = [active_item]
              }
              quick_pick.show()
              return
            }

            if (event.button === delete_button) {
              const current_timestamp = Date.now()
              active_deletion_timestamp = current_timestamp
              const deleted_context_name = item.context.name

              const snapshot = new Map<string, SavedContext>()
              const roots = context_to_roots.get(deleted_context_name) || []

              for (const root of roots) {
                const root_contexts = load_contexts_for_workspace(
                  extension_context,
                  root
                )
                const found = root_contexts.find(
                  (c) => c.name === deleted_context_name
                )
                if (found) {
                  snapshot.set(root, found)
                  const new_contexts = root_contexts.filter(
                    (c) => c.name !== deleted_context_name
                  )
                  save_contexts_for_workspace(
                    extension_context,
                    root,
                    new_contexts
                  )
                }
              }

              const reloaded = refresh_contexts()
              internal_contexts = reloaded.merged
              context_to_roots = reloaded.context_to_roots
              quick_pick.items = create_quick_pick_items(internal_contexts)

              active_dialog_count++
              const choice = await vscode.window.showInformationMessage(
                dictionary.information_message
                  .DELETED_CONTEXT_FROM_WORKSPACE_STATE,
                'Undo'
              )
              active_dialog_count--

              if (active_deletion_timestamp !== current_timestamp) {
                if (choice == 'Undo') {
                  vscode.window.showInformationMessage(
                    'Could not undo as another context was deleted.'
                  )
                }
                quick_pick.show()
                return
              }

              if (choice == 'Undo') {
                for (const [root, saved] of snapshot.entries()) {
                  const root_contexts = load_contexts_for_workspace(
                    extension_context,
                    root
                  )
                  root_contexts.unshift(saved)
                  save_contexts_for_workspace(
                    extension_context,
                    root,
                    root_contexts
                  )
                }
                vscode.window.showInformationMessage(
                  dictionary.information_message.RESTORED_CONTEXT(
                    deleted_context_name
                  )
                )
                const reloaded_undo = refresh_contexts()
                internal_contexts = reloaded_undo.merged
                context_to_roots = reloaded_undo.context_to_roots
                quick_pick.items = create_quick_pick_items(internal_contexts)
              }

              if (internal_contexts.length == 0) {
                await vscode.window.showInformationMessage(
                  dictionary.information_message
                    .NO_SAVED_CONTEXTS_IN_WORKSPACE_STATE
                )
                go_back_after_delete = true
                quick_pick.hide()
              } else {
                quick_pick.show()
              }
              return
            }
          })
        )
      })

      quick_pick.show()
      const selected = await quick_pick_promise
      if (!selected) return

      if (selected == 'back') {
        return 'back'
      }

      const context_to_apply = internal_contexts.find(
        (c) => c.name == selected.label
      )

      if (!context_to_apply) {
        vscode.window.showErrorMessage(
          dictionary.error_message.COULD_NOT_FIND_SELECTED_CONTEXT(
            selected.label
          )
        )
        Logger.error({
          function_name: 'handle_workspace_state_source',
          message: 'Could not find selected context after potential edits',
          data: selected.label
        })
        return
      }

      // Move to top (Recent) for all involved roots
      const roots = context_to_roots.get(context_to_apply.name) || []
      for (const root of roots) {
        const root_contexts = load_contexts_for_workspace(
          extension_context,
          root
        )
        const found_idx = root_contexts.findIndex(
          (c) => c.name === context_to_apply.name
        )
        if (found_idx !== -1) {
          const [moved] = root_contexts.splice(found_idx, 1)
          root_contexts.unshift(moved)
          save_contexts_for_workspace(extension_context, root, root_contexts)
        }
      }

      // Apply using the merged context (which has prefixes for multi-root)
      const primary_workspace_root =
        workspace_provider.get_workspace_roots()[0]!
      const result = await apply_saved_context(
        context_to_apply,
        primary_workspace_root,
        workspace_provider,
        extension_context
      )

      if (result === 'back') {
        const reloaded = refresh_contexts()
        internal_contexts = reloaded.merged
        context_to_roots = reloaded.context_to_roots
        continue
      }

      on_context_selected()
      return
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_SELECTING_SAVED_CONTEXT(error.message)
    )
    Logger.error({
      function_name: 'handle_workspace_state_source',
      message: 'Error selecting saved context',
      data: error
    })
  }
}
