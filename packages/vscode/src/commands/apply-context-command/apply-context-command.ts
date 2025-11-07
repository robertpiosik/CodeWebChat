import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace-provider'
import {
  SAVED_CONTEXTS_STATE_KEY,
  LAST_APPLY_CONTEXT_OPTION_STATE_KEY
} from '../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { dictionary } from '@shared/constants/dictionary'
import {
  handle_clipboard_source,
  handle_json_file_source,
  handle_unstaged_files_source,
  handle_workspace_state_source,
  load_and_merge_file_contexts
} from './sources'

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

        const { merged: file_contexts } = await load_and_merge_file_contexts()

        const main_quick_pick_options: (vscode.QuickPickItem & {
          value: 'internal' | 'file' | 'other'
        })[] = [
          {
            label: 'Source',
            kind: vscode.QuickPickItemKind.Separator
          } as any
        ]

        main_quick_pick_options.push({
          label: 'Workspace state',
          description: `${internal_contexts.length} ${
            internal_contexts.length == 1 ? 'context' : 'contexts'
          }`,
          value: 'internal'
        })

        main_quick_pick_options.push({
          label: 'JSON file',
          description: `${file_contexts.length} ${
            file_contexts.length == 1 ? 'context' : 'contexts'
          }`,
          value: 'file'
        })

        main_quick_pick_options.push({
          label: 'Other',
          value: 'other'
        })

        const final_quick_pick_options = main_quick_pick_options

        const main_quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { value: 'internal' | 'file' | 'other' }
        >()
        main_quick_pick.items = final_quick_pick_options
        main_quick_pick.placeholder = 'Select option'
        if (last_main_selection_value) {
          const active_item = final_quick_pick_options.find(
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
          main_quick_pick.onDidAccept(() => {
            is_accepted = true
            resolve(main_quick_pick.selectedItems[0])
            main_quick_pick.hide()
          })
          main_quick_pick.onDidHide(() => {
            if (!is_accepted) {
              resolve(undefined)
            }
            main_quick_pick.dispose()
          })
          main_quick_pick.show()
        })

        if (!main_selection) return

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
          if (result === 'back') {
            show_main_menu = true
          }
        } else if (main_selection.value == 'file') {
          const result = await handle_json_file_source(
            workspace_provider,
            extension_context,
            on_context_selected
          )
          if (result === 'back') {
            show_main_menu = true
          }
        } else if (main_selection.value == 'other') {
          const BACK_LABEL = '$(arrow-left) Back'
          const other_quick_pick_options: (vscode.QuickPickItem & {
            value?: 'clipboard' | 'unstaged'
          })[] = [
            { label: BACK_LABEL },
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            {
              label: 'Select files based on paths found in the clipboard text',
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
          other_quick_pick.items = other_quick_pick_options
          other_quick_pick.placeholder = 'Select other option'

          const other_selection = await new Promise<
            | (vscode.QuickPickItem & { value?: 'clipboard' | 'unstaged' })
            | undefined
          >((resolve) => {
            let is_accepted = false
            other_quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(other_quick_pick.selectedItems[0])
              other_quick_pick.hide()
            })
            other_quick_pick.onDidHide(() => {
              if (!is_accepted) {
                resolve(undefined)
              }
              other_quick_pick.dispose()
            })
            other_quick_pick.show()
          })

          if (!other_selection || other_selection.label === BACK_LABEL) {
            show_main_menu = true
            continue
          }

          if (other_selection.value == 'clipboard') {
            await handle_clipboard_source(workspace_provider)
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
