import * as vscode from 'vscode'

export const close_file_tabs = async (file_path: string) => {
  const tabs_to_close: vscode.Tab[] = []
  for (const tab_group of vscode.window.tabGroups.all) {
    tabs_to_close.push(
      ...tab_group.tabs.filter((tab) => {
        const tab_uri = (tab.input as any)?.uri as vscode.Uri | undefined
        return tab_uri && tab_uri.fsPath === file_path
      })
    )
  }
  if (tabs_to_close.length > 0) {
    await vscode.window.tabGroups.close(tabs_to_close)
  }
}
