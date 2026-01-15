import * as vscode from 'vscode'
import * as path from 'path'

export const handle_open_allow_patterns_settings = async (): Promise<void> => {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return
  }

  let selectedFolder: vscode.WorkspaceFolder | undefined

  if (workspaceFolders.length > 1) {
    const items = workspaceFolders.map((f) => ({ label: f.name, folder: f }))
    selectedFolder = await new Promise<vscode.WorkspaceFolder | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick<(typeof items)[0]>()
        quick_pick.items = items
        quick_pick.title = 'Workspaces'
        quick_pick.placeholder =
          'Select workspace folder to configure allow patterns'
        const close_button: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Close'
        }
        quick_pick.buttons = [close_button]
        let is_accepted = false
        const disposables: vscode.Disposable[] = []
        const cleanup = () => {
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        }
        disposables.push(
          quick_pick.onDidAccept(() => {
            is_accepted = true
            const selected = quick_pick.selectedItems[0]
            resolve(selected?.folder)
            quick_pick.hide()
          }),
          quick_pick.onDidTriggerButton((button) => {
            if (button === close_button) {
              quick_pick.hide()
            }
          }),
          quick_pick.onDidHide(() => {
            if (!is_accepted) {
              resolve(undefined)
            }
            cleanup()
          })
        )
        quick_pick.show()
      }
    )
  } else {
    selectedFolder = workspaceFolders[0]
  }

  if (!selectedFolder) {
    return
  }

  // Ensure key exists
  const config = vscode.workspace.getConfiguration(
    'codeWebChat',
    selectedFolder.uri
  )
  const inspect = config.inspect('allowPatterns')

  if (inspect?.workspaceFolderValue === undefined) {
    await config.update(
      'allowPatterns',
      [],
      vscode.ConfigurationTarget.WorkspaceFolder
    )
  }

  // Open the file
  const settingsPath = path.join(
    selectedFolder.uri.fsPath,
    '.vscode',
    'settings.json'
  )
  const settingsUri = vscode.Uri.file(settingsPath)

  try {
    const doc = await vscode.workspace.openTextDocument(settingsUri)
    await vscode.window.showTextDocument(doc)
  } catch (e) {
    vscode.window.showErrorMessage(
      `Could not open settings file at ${settingsPath}`
    )
  }
}
