import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { select_context_source } from '../utils/source-selector'
import { save_to_workspace_state } from './save-to-workspace-state'
import { save_to_json_file } from './save-to-json-file'
import { t } from '@/i18n'
import { dictionary } from '@shared/constants/dictionary'

export const save_current_selection_command = (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
}): vscode.Disposable => {
  return vscode.commands.registerCommand(
    'codeWebChat.saveCurrentSelection',
    async () => {
      const checked_files = params.workspace_provider.get_checked_files()
      if (checked_files.length == 0) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.NOTHING_IN_CONTEXT_TO_SAVE
        )
        return
      }

      let show_main_menu = true

      while (show_main_menu) {
        show_main_menu = false

        const source = await select_context_source({
          extension_context: params.extension_context,
          title: t('command.context-restoration.destination.title')
        })

        if (!source) return

        if (source == 'internal') {
          const result = await save_to_workspace_state({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context
          })
          if (result == 'back') show_main_menu = true
        } else if (source == 'file') {
          const result = await save_to_json_file({
            workspace_provider: params.workspace_provider,
            extension_context: params.extension_context
          })
          if (result == 'back') show_main_menu = true
        }
      }
    }
  )
}
