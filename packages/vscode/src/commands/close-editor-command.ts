import * as vscode from 'vscode'

export const close_editor_command = () => {
  return vscode.commands.registerCommand(
    'codeWebChat.closeEditor',
    async (item: any) => {
      if (item && item.resourceUri) {
        // Find all tabs that match this URI
        const tabs = vscode.window.tabGroups.all.flatMap((group) =>
          group.tabs.filter(
            (tab) =>
              tab.input instanceof vscode.TabInputText &&
              tab.input.uri.toString() == item.resourceUri.toString()
          )
        )

        if (tabs.length > 0) {
          await vscode.window.tabGroups.close(tabs)
        }
      }
    }
  )
}
