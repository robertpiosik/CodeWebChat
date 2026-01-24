import * as vscode from 'vscode'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { load_and_merge_global_contexts } from '@/commands/apply-context-command/helpers/saving'
import { load_and_merge_file_contexts } from '@/commands/apply-context-command/sources'
import { LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY } from '@/constants/state-keys'

export const handle_saved_context_item = async (
  context: vscode.ExtensionContext
): Promise<string | 'continue' | undefined> => {
  try {
    const workspace_folders = vscode.workspace.workspaceFolders || []
    if (workspace_folders.length == 0) {
      vscode.window.showErrorMessage(dictionary.error_message.NO_WORKSPACE_ROOT)
      return undefined
    }

    const { merged: internal_contexts, context_to_roots: internal_roots } =
      load_and_merge_global_contexts(context)
    const { merged: file_contexts, context_to_roots: file_roots } =
      await load_and_merge_file_contexts()

    const source_options: (vscode.QuickPickItem & {
      value: 'WorkspaceState' | 'JSON'
    })[] = []
    if (internal_contexts.length > 0) {
      source_options.push({
        label: 'Workspace State',
        description: `${internal_contexts.length} context${
          internal_contexts.length == 1 ? '' : 's'
        }`,
        value: 'WorkspaceState'
      })
    }
    if (file_contexts.length > 0) {
      source_options.push({
        label: 'JSON File (.vscode/contexts.json)',
        description: `${file_contexts.length} context${
          file_contexts.length == 1 ? '' : 's'
        }`,
        value: 'JSON'
      })
    }

    if (source_options.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_SAVED_CONTEXTS_FOUND
      )
      return 'continue'
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let source: 'WorkspaceState' | 'JSON' | undefined
      if (source_options.length > 1) {
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { value: 'WorkspaceState' | 'JSON' }
        >()
        quick_pick.items = source_options
        quick_pick.placeholder = 'Select context source'
        quick_pick.title = 'Context Sources'
        quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const last_source = context.workspaceState.get<string>(
          LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY
        )
        if (last_source) {
          const active = source_options.find(
            (item) => item.value == last_source
          )
          if (active) quick_pick.activeItems = [active]
        }

        const selection = await new Promise<
          | (vscode.QuickPickItem & { value: 'WorkspaceState' | 'JSON' })
          | 'back'
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
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            }),
            quick_pick.onDidHide(() => {
              if (!is_accepted && !did_trigger_back) {
                resolve(undefined)
              }
              disposables.forEach((d) => d.dispose())
              quick_pick.dispose()
            })
          )
          quick_pick.show()
        })

        if (!selection || selection == 'back') return 'continue'

        await context.workspaceState.update(
          LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY,
          selection.value
        )

        source = selection.value
      } else {
        source = source_options[0].value
      }

      if (!source) return 'continue'

      const contexts_to_use =
        source == 'WorkspaceState' ? internal_contexts : file_contexts
      const roots_map = source == 'WorkspaceState' ? internal_roots : file_roots

      const is_multi_root = workspace_folders.length > 1

      const context_items: vscode.QuickPickItem[] = []

      if (contexts_to_use.length > 0) {
        context_items.push({
          label:
            source == 'WorkspaceState' ? 'recent entries' : 'entries (A-Z)',
          kind: vscode.QuickPickItemKind.Separator
        })
      }

      context_items.push(
        ...contexts_to_use.map((ctx) => {
          const roots = roots_map.get(ctx.name) || []
          let description = `${ctx.paths.length} path${
            ctx.paths.length == 1 ? '' : 's'
          }`

          if (roots.length > 0 && (roots.length > 1 || is_multi_root)) {
            const workspace_names = roots.map((root) => {
              const folder = workspace_folders.find(
                (f) => f.uri.fsPath === root
              )
              return folder?.name || path.basename(root)
            })
            description += ` · ${workspace_names.join(', ')}`
          }

          return {
            label: ctx.name,
            description
          }
        })
      )

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = context_items
      quick_pick.placeholder = 'Select a saved context'
      quick_pick.title = 'Saved Contexts'
      quick_pick.buttons = [vscode.QuickInputButtons.Back]

      const selected_context = await new Promise<
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
          quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(quick_pick.selectedItems[0])
            quick_pick.hide()
          }),
          quick_pick.onDidHide(() => {
            if (!is_accepted && !did_trigger_back) {
              resolve(undefined)
            }
            disposables.forEach((d) => d.dispose())
            quick_pick.dispose()
          })
        )
        quick_pick.show()
      })

      if (!selected_context || selected_context == 'back') {
        if (source_options.length > 1) {
          continue
        }
        return 'continue'
      }

      if (selected_context) {
        return `#SavedContext:${source} "${selected_context.label}" `
      }

      return 'continue'
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to load saved contexts. Please check your configuration.'
    )
    return 'continue'
  }
}
