import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { select_context_paths } from '../utils/select-context-paths'
import {
  load_and_merge_global_contexts,
  save_contexts_for_workspace,
  load_contexts_for_workspace
} from '../utils/global-storage-utils'
import { group_files_by_workspace, condense_paths } from '../utils/path-utils'
import { t } from '@/i18n'
import { create_context_description } from '../utils/create-context-description'

let active_deletion_timestamp: number | undefined

export const restore_from_workspace_state = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  on_context_selected: () => void
}): Promise<'back' | void> => {
  try {
    const refresh_contexts = () =>
      load_and_merge_global_contexts(params.extension_context)
    let { merged: internal_contexts, context_to_roots } = refresh_contexts()

    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: t('command.context-restoration.action.rename')
    }
    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: t('command.context-restoration.action.delete')
    }

    while (true) {
      const create_quick_pick_items = async (contexts: SavedContext[]) => {
        const items: (vscode.QuickPickItem & {
          context?: SavedContext
          buttons?: vscode.QuickInputButton[]
          index?: number
        })[] = []

        if (contexts.length > 0) {
          items.push({
            label: t('command.context-restoration.recent-entries'),
            kind: vscode.QuickPickItemKind.Separator
          })

          for (let index = 0; index < contexts.length; index++) {
            const context = contexts[index]
            const buttons = [edit_button, delete_button]
            const roots = context_to_roots.get(context.name) || []
            const { description } = await create_context_description({
              context,
              workspace_provider: params.workspace_provider,
              roots
            })

            items.push({
              label: context.name,
              description,
              context,
              buttons,
              index
            })
          }
        }
        return items
      }

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.title = t('command.context-restoration.select-saved.title')
      quick_pick.placeholder = t(
        'command.context-restoration.select-saved.workspace'
      )
      quick_pick.buttons = [vscode.QuickInputButtons.Back]
      quick_pick.items = await create_quick_pick_items(internal_contexts)

      let active_dialog_count = 0
      let go_back_after_delete = false

      const quick_pick_promise = new Promise<
        'back' | (vscode.QuickPickItem & { context?: SavedContext }) | undefined
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
            is_accepted = true
            quick_pick.hide()
            resolve(quick_pick.selectedItems[0] as any)
          }),
          quick_pick.onDidHide(() => {
            if (active_dialog_count > 0) return
            if (go_back_after_delete) resolve('back')
            else if (!is_accepted && !did_trigger_back) resolve('back')
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          }),
          quick_pick.onDidTriggerItemButton(async (event) => {
            const item = event.item as vscode.QuickPickItem & {
              context: SavedContext
              index: number
            }

            if (event.button === edit_button) {
              active_dialog_count++
              const input_box = vscode.window.createInputBox()
              input_box.title = t('command.context-restoration.rename.title')
              input_box.prompt = t('command.context-restoration.rename.prompt')
              input_box.value = item.context.name

              const new_name = await new Promise<string | undefined | 'back'>(
                (resolve) => {
                  let accepted = false
                  const disposables: vscode.Disposable[] = []
                  const validate = (value: string) => {
                    const trimmed = value.trim()
                    if (!trimmed) {
                      input_box.validationMessage = t(
                        'command.context-restoration.rename.empty'
                      )
                      return false
                    }
                    if (
                      internal_contexts.find(
                        (c) =>
                          c.name === trimmed && c.name !== item.context.name
                      )
                    ) {
                      input_box.validationMessage = t(
                        'command.context-restoration.rename.exists'
                      )
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
                      if (!accepted) resolve(undefined)
                      disposables.forEach((d) => d.dispose())
                      input_box.dispose()
                    })
                  )
                  input_box.show()
                }
              )
              active_dialog_count--

              let name_to_highlight = item.context.name
              if (new_name && new_name !== 'back') {
                const trimmed_name = new_name
                if (trimmed_name !== item.context.name) {
                  const roots = context_to_roots.get(item.context.name) || []
                  for (const root of roots) {
                    const root_contexts = load_contexts_for_workspace({
                      context: params.extension_context,
                      workspace_root: root
                    })
                    const updated = root_contexts.map((c) =>
                      c.name === item.context.name
                        ? { ...c, name: trimmed_name }
                        : c
                    )
                    save_contexts_for_workspace({
                      context: params.extension_context,
                      workspace_root: root,
                      contexts: updated
                    })
                  }
                  name_to_highlight = trimmed_name
                  const reloaded = refresh_contexts()
                  internal_contexts = reloaded.merged
                  context_to_roots = reloaded.context_to_roots
                }
              }

              quick_pick.items =
                await create_quick_pick_items(internal_contexts)
              const active_item = quick_pick.items.find(
                (i) => i.label == name_to_highlight
              )
              if (active_item) quick_pick.activeItems = [active_item]
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
                const root_contexts = load_contexts_for_workspace({
                  context: params.extension_context,
                  workspace_root: root
                })
                const found = root_contexts.find(
                  (c) => c.name === deleted_context_name
                )
                if (found) {
                  snapshot.set(root, found)
                  const new_contexts = root_contexts.filter(
                    (c) => c.name !== deleted_context_name
                  )
                  save_contexts_for_workspace({
                    context: params.extension_context,
                    workspace_root: root,
                    contexts: new_contexts
                  })
                }
              }

              const reloaded = refresh_contexts()
              internal_contexts = reloaded.merged
              context_to_roots = reloaded.context_to_roots
              quick_pick.items =
                await create_quick_pick_items(internal_contexts)

              active_dialog_count++
              const choice = await vscode.window.showInformationMessage(
                dictionary.information_message
                  .DELETED_CONTEXT_FROM_WORKSPACE_STATE,
                'Undo'
              )
              active_dialog_count--

              if (active_deletion_timestamp !== current_timestamp) {
                if (choice == 'Undo')
                  vscode.window.showInformationMessage(
                    t('command.context-restoration.undo.failed')
                  )
                quick_pick.show()
                return
              }

              if (choice == 'Undo') {
                for (const [root, saved] of snapshot.entries()) {
                  const root_contexts = load_contexts_for_workspace({
                    context: params.extension_context,
                    workspace_root: root
                  })
                  root_contexts.unshift(saved)
                  save_contexts_for_workspace({
                    context: params.extension_context,
                    workspace_root: root,
                    contexts: root_contexts
                  })
                }
                vscode.window.showInformationMessage(
                  dictionary.information_message.RESTORED_CONTEXT(
                    deleted_context_name
                  )
                )
                const reloaded_undo = refresh_contexts()
                internal_contexts = reloaded_undo.merged
                context_to_roots = reloaded_undo.context_to_roots
                quick_pick.items =
                  await create_quick_pick_items(internal_contexts)
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
      if (selected == 'back') return 'back'

      const context_to_apply = internal_contexts.find(
        (c) => c.name == selected.label
      )
      if (!context_to_apply) return

      const roots = context_to_roots.get(context_to_apply.name) || []
      for (const root of roots) {
        const root_contexts = load_contexts_for_workspace({
          context: params.extension_context,
          workspace_root: root
        })
        const found_idx = root_contexts.findIndex(
          (c) => c.name === context_to_apply.name
        )
        if (found_idx !== -1) {
          const [moved] = root_contexts.splice(found_idx, 1)
          root_contexts.unshift(moved)
          save_contexts_for_workspace({
            context: params.extension_context,
            workspace_root: root,
            contexts: root_contexts
          })
        }
      }

      const result = await select_context_paths({
        context: context_to_apply,
        workspace_provider: params.workspace_provider,
        update_context_paths: async (remaining_files: string[]) => {
          const files_by_workspace = group_files_by_workspace(remaining_files)
          const current_roots =
            context_to_roots.get(context_to_apply.name) || []
          const all_roots = new Set([
            ...current_roots,
            ...files_by_workspace.keys()
          ])

          for (const root of all_roots) {
            let root_contexts = load_contexts_for_workspace({
              context: params.extension_context,
              workspace_root: root
            })
            root_contexts = root_contexts.filter(
              (c) => c.name !== context_to_apply.name
            )

            const files = files_by_workspace.get(root)
            if (files && files.length > 0) {
              const condensed_paths = condense_paths({
                paths: files,
                workspace_root: root,
                workspace_provider: params.workspace_provider
              })
              const relative_paths = condensed_paths.map((p) =>
                p.replace(/\\/g, '/')
              )
              root_contexts.unshift({
                name: context_to_apply.name,
                paths: relative_paths
              })
            }
            save_contexts_for_workspace({
              context: params.extension_context,
              workspace_root: root,
              contexts: root_contexts
            })
          }

          const reloaded = refresh_contexts()
          internal_contexts = reloaded.merged
          context_to_roots = reloaded.context_to_roots
        }
      })

      if (result === 'back') {
        const reloaded = refresh_contexts()
        internal_contexts = reloaded.merged
        context_to_roots = reloaded.context_to_roots
        continue
      }

      params.on_context_selected()
      return
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_SELECTING_SAVED_CONTEXT(error.message)
    )
    Logger.error({
      function_name: 'restore_from_workspace_state',
      message: 'Error selecting saved context',
      data: error
    })
  }
}
