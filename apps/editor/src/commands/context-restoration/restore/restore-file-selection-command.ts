import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { select_context_source } from '../utils/source-selector'
import { restore_from_workspace_state } from './restore-from-workspace-state'
import { restore_from_json_file } from './restore-from-json-file'
import { t } from '@/i18n'

export const restore_file_selection_command = (params: {
  workspace_provider: WorkspaceProvider
  on_context_selected: () => void
  extension_context: vscode.ExtensionContext
}): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.restoreFileSelection',
    async () => {
      let show_main_menu = true

      while (show_main_menu) {
        show_main_menu = false

        const { source, skipped_menu } = await select_context_source({
          extension_context: params.extension_context,
          title: t('command.context-restoration.source.title'),
          mode: 'restore'
        })

        if (!source) return

        let action_result: 'back' | void = undefined

        if (source == 'internal') {
          action_result = await restore_from_workspace_state({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            on_context_selected: params.on_context_selected,
            show_back_button: !skipped_menu
          })
        } else if (source == 'file') {
          action_result = await restore_from_json_file({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            on_context_selected: params.on_context_selected,
            show_back_button: !skipped_menu
          })
        }

        if (action_result == 'back') {
          if (skipped_menu) {
            return
          }
          show_main_menu = true
        }
      }
    }
  )
}
