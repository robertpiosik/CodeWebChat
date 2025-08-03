import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { RECENT_FILES_STORAGE_KEY } from '@/constants/state-keys'

const MAX_RECENT_FILES = 50
const REMOVE_BUTTON_TOOLTIP = 'Remove from Recent Files'

export class RecentFileManager {
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  public setupListener(): vscode.Disposable {
    return vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.uri.scheme === 'file') {
        this.addFile(document.uri)
      }
    })
  }

  public getRecentFiles(): string[] {
    return this.context.workspaceState.get<string[]>(
      RECENT_FILES_STORAGE_KEY,
      []
    )
  }

  public addFile(uri: vscode.Uri): void {
    const filePath = uri.fsPath
    let recentFiles = this.getRecentFiles().filter((p) => p !== filePath)
    recentFiles.unshift(filePath)

    if (recentFiles.length > MAX_RECENT_FILES) {
      recentFiles = recentFiles.slice(0, MAX_RECENT_FILES)
    }
    this.context.workspaceState.update(RECENT_FILES_STORAGE_KEY, recentFiles)
  }

  public removeFile(uri: vscode.Uri): void {
    const filePath = uri.fsPath
    let recentFiles = this.getRecentFiles().filter((p) => p !== filePath)

    this.context.workspaceState.update(RECENT_FILES_STORAGE_KEY, recentFiles)
  }

  public getRecentFileUris(): vscode.Uri[] {
    const paths = this.context.workspaceState.get<string[]>(
      RECENT_FILES_STORAGE_KEY,
      []
    )
    return paths
      .map((p) => vscode.Uri.file(p))
      .filter((uri) => fs.existsSync(uri.fsPath))
  }

  public async showFilePicker(workspace_root: string) {
    return new Promise<string | undefined>((resolve) => {
      const quickPick = vscode.window.createQuickPick<{
        label: string
        description?: string
        path: string
        uri: vscode.Uri
      }>()
      quickPick.placeholder = 'Search for a file by name'

      let debounceTimeout: NodeJS.Timeout

      // Helper function to create a QuickPickItem for a file
      function createFileQuickPickItem(
        fileUri: vscode.Uri,
        withRemoveButton: boolean = true
      ): vscode.QuickPickItem & { path: string; uri: vscode.Uri } {
        const relativePath = path.relative(workspace_root, fileUri.fsPath)
        const removeButton: vscode.QuickInputButton = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: REMOVE_BUTTON_TOOLTIP
        }
        const buttons = []

        if (withRemoveButton) {
          buttons.push(removeButton)
        }

        return {
          label: path.basename(fileUri.fsPath),
          description: path.dirname(relativePath),
          path: relativePath,
          uri: fileUri,
          buttons
        }
      }

      const recentFiles = this.getRecentFileUris().map((uri) =>
        createFileQuickPickItem(uri)
      )

      // Initially, show only recent files
      quickPick.items = recentFiles

      quickPick.onDidChangeValue((value) => {
        clearTimeout(debounceTimeout)

        // When user clears the input, show recent files again
        if (!value || value.length < 1) {
          quickPick.busy = false
          quickPick.items = recentFiles
          return
        }

        quickPick.busy = true // Show loading indicator

        // Debounce the search to avoid excessive API calls
        debounceTimeout = setTimeout(async () => {
          const query = `**/*${value}*`
          const searchResults = await vscode.workspace.findFiles(
            query,
            undefined,
            100
          )

          if (searchResults) {
            quickPick.items = searchResults.map((uri) =>
              createFileQuickPickItem(
                uri,
                this.getRecentFiles().includes(uri.fsPath)
              )
            )
          }
          quickPick.busy = false
        }, 300) // 300ms debounce delay
      })

      quickPick.onDidTriggerItemButton((e) => {
        const fileUriToRemove = e.item.uri
        const currentListItems = quickPick.items.filter(
          (item) => item.uri.fsPath !== fileUriToRemove.fsPath
        )

        this.removeFile(fileUriToRemove)

        const recentListItems = this.getRecentFiles()

        quickPick.items = currentListItems.map((item) =>
          createFileQuickPickItem(
            item.uri,
            recentListItems.includes(item.uri.fsPath)
          )
        )
      })

      quickPick.onDidAccept(() => {
        const selectedFile = quickPick.selectedItems[0]
        if (selectedFile) {
          resolve(selectedFile.path)
          this.addFile(selectedFile.uri)
        }

        quickPick.hide()
      })

      quickPick.onDidHide(() => {
        clearTimeout(debounceTimeout)
        quickPick.dispose()
        resolve(undefined) // Resolve with undefined if the user dismisses the picker
      })

      quickPick.show()
    })
  }
}
