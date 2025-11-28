import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY
} from '../../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { apply_saved_context } from '../utils'

export async function handle_workspace_state_source(
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  on_context_selected: () => void
): Promise<'back' | void> {
  try {
    let internal_contexts: SavedContext[] =
      extension_context.workspaceState.get(SAVED_CONTEXTS_STATE_KEY, [])

    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: 'Rename'
    }
    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: 'Delete'
    }

    const create_quick_pick_items = (contexts: SavedContext[]) => {
      const context_items = contexts.map((context, index) => {
        const buttons = [edit_button, delete_button]

        const description = `${context.paths.length} ${
          context.paths.length == 1 ? 'path' : 'paths'
        }`

        return {
          label: context.name,
          description,
          context,
          buttons,
          index
        }
      })
      return context_items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.title = 'Select Saved Context'
    quick_pick.items = create_quick_pick_items(internal_contexts)
    quick_pick.placeholder = `Select saved context (from workspace state)`
    quick_pick.buttons = [vscode.QuickInputButtons.Back]

    const last_selected_context_name =
      extension_context.workspaceState.get<string>(
        LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY
      )

    if (last_selected_context_name) {
      const active_item = quick_pick.items.find(
        (item) => item.label === last_selected_context_name
      )
      if (active_item) {
        quick_pick.activeItems = [active_item]
      }
    }

    let is_showing_dialog = false
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
        quick_pick.onDidAccept(() => {
          is_accepted = true
          const selectedItem = quick_pick
            .selectedItems[0] as vscode.QuickPickItem & {
            context?: SavedContext
          }
          if (selectedItem?.context) {
            extension_context.workspaceState.update(
              LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY,
              selectedItem.context.name
            )
          }
          quick_pick.hide()
          resolve(selectedItem)
        }),

        quick_pick.onDidHide(() => {
          if (is_showing_dialog) {
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

          await extension_context.workspaceState.update(
            LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY,
            item.context.name
          )

          if (event.button === edit_button) {
            is_showing_dialog = true
            const new_name = await vscode.window.showInputBox({
              prompt: 'Enter new name for context',
              value: item.context.name,
              validateInput: (value) => {
                if (!value.trim()) {
                  return 'Name cannot be empty'
                }

                const duplicate = internal_contexts.find(
                  (c) => c.name == value.trim() && c.name != item.context.name
                )

                if (duplicate) {
                  return 'A context with this name already exists'
                }

                return null
              }
            })
            is_showing_dialog = false

            let name_to_highlight = item.context.name

            if (new_name?.trim()) {
              const trimmed_name = new_name.trim()
              let context_updated = false

              if (trimmed_name != item.context.name) {
                const updated_contexts = internal_contexts.map((c) =>
                  c.name == item.context.name ? { ...c, name: trimmed_name } : c
                )

                await extension_context.workspaceState.update(
                  SAVED_CONTEXTS_STATE_KEY,
                  updated_contexts
                )
                internal_contexts = updated_contexts
                context_updated = true
                name_to_highlight = trimmed_name
              }

              if (context_updated) {
                await extension_context.workspaceState.update(
                  LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY,
                  trimmed_name
                )
              }
            }

            // Always refresh and show the quick pick, even if cancelled
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
            const deleted_context = item.context
            const deleted_context_name = item.context.name
            const deleted_index = item.index

            const updated_contexts = internal_contexts.filter(
              (c) => c.name != deleted_context_name
            )
            await extension_context.workspaceState.update(
              SAVED_CONTEXTS_STATE_KEY,
              updated_contexts
            )
            internal_contexts = updated_contexts
            quick_pick.items = create_quick_pick_items(internal_contexts)

            is_showing_dialog = true
            const choice = await vscode.window.showInformationMessage(
              dictionary.information_message.DELETED_CONTEXT_FROM_WORKSPACE_STATE(
                deleted_context_name
              ),
              'Undo'
            )
            is_showing_dialog = false

            if (choice == 'Undo') {
              internal_contexts.splice(deleted_index, 0, deleted_context)
              await extension_context.workspaceState.update(
                SAVED_CONTEXTS_STATE_KEY,
                internal_contexts
              )
              vscode.window.showInformationMessage( // NOSONAR
                dictionary.information_message.RESTORED_CONTEXT(
                  deleted_context_name
                )
              )
              quick_pick.items = create_quick_pick_items(internal_contexts)
            }

            if (internal_contexts.length === 0) {
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

    if (selected === 'back') {
      return 'back'
    }

    const context_to_apply = internal_contexts.find(
      (c) => c.name == selected.label
    )

    if (!context_to_apply) {
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_FIND_SELECTED_CONTEXT(selected.label)
      )
      Logger.error({
        function_name: 'apply_context_command',
        message: 'Could not find selected context after potential edits',
        data: selected.label
      })
      return
    }

    const primary_workspace_root = workspace_provider.getWorkspaceRoot()!

    await apply_saved_context(
      context_to_apply,
      primary_workspace_root,
      workspace_provider,
      extension_context
    )

    on_context_selected()
  } catch (error: any) {
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_SELECTING_SAVED_CONTEXT(error.message)
    )
    Logger.error({
      function_name: 'apply_context_command',
      message: 'Error selecting saved context',
      data: error
    })
  }
}
