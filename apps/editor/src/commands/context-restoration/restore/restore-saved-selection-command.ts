import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { select_context_source } from '../utils/source-selector'
import { restore_from_workspace_state } from './restore-from-workspace-state'
import { restore_from_json_file } from './restore-from-json-file'
import { t } from '@/i18n'

export const restore_saved_selection_command = (params: {
  workspace_provider: WorkspaceProvider
  on_context_selected: () => void
  extension_context: vscode.ExtensionContext
}): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.restoreSavedSelection',
    async () => {
      let show_main_menu = true

      while (show_main_menu) {
        show_main_menu = false

        const source = await select_context_source({
          extension_context: params.extension_context,
          title: t('command.context-restoration.source.title')
        })

        if (!source) return

        if (source == 'internal') {
          const result = await restore_from_workspace_state({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            on_context_selected: params.on_context_selected
          })
          if (result == 'back') show_main_menu = true
        } else if (source == 'file') {
          const result = await restore_from_json_file({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context,
            on_context_selected: params.on_context_selected
          })
          if (result == 'back') show_main_menu = true
        }
      }
    }
  )
}
