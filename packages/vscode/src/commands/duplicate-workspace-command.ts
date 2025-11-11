import * as vscode from 'vscode'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { WebsitesProvider } from '../context/providers/websites-provider'
import {
  API_EDIT_FORMAT_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY,
  DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY,
  type DuplicateWorkspaceContext
} from '../constants/state-keys'

export function duplicate_workspace_command(
  workspace_provider: WorkspaceProvider,
  websites_provider: WebsitesProvider,
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(
    'codeWebChat.duplicateWorkspace',
    async () => {
      const checked_files = workspace_provider.get_all_checked_paths()
      const checked_websites = websites_provider
        .get_checked_websites()
        .map((w) => w.url)
      const workspace_root_folders =
        vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ??
        []

      const open_editors: { path: string; view_column?: number }[] = []
      for (const tab_group of vscode.window.tabGroups.all) {
        for (const tab of tab_group.tabs) {
          if (
            tab.input instanceof vscode.TabInputText &&
            tab.input.uri.scheme == 'file'
          ) {
            open_editors.push({
              path: tab.input.uri.fsPath,
              view_column: tab_group.viewColumn
            })
          }
        }
      }

      const context_to_save: DuplicateWorkspaceContext = {
        checked_files,
        checked_websites,
        workspace_root_folders,
        timestamp: Date.now(),
        open_editors
      }

      const api_edit_format = context.workspaceState.get(
        API_EDIT_FORMAT_STATE_KEY
      )
      if (api_edit_format) {
        await context.globalState.update(
          API_EDIT_FORMAT_STATE_KEY,
          api_edit_format
        )
      }

      const chat_edit_format = context.workspaceState.get(
        CHAT_EDIT_FORMAT_STATE_KEY
      )
      if (chat_edit_format) {
        await context.globalState.update(
          CHAT_EDIT_FORMAT_STATE_KEY,
          chat_edit_format
        )
      }

      await context.globalState.update(
        DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY,
        context_to_save
      )

      vscode.commands.executeCommand(
        'workbench.action.duplicateWorkspaceInNewWindow'
      )
    }
  )
}
