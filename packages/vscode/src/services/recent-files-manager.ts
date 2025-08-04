import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { RECENT_FILES_STORAGE_KEY } from '@/constants/state-keys'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'

const MAX_RECENT_FILES = 50
const DEBOUNCE_DELAY = 300
const REMOVE_BUTTON_TOOLTIP = 'Remove from Recent Files'

type QuickPickItemFile = vscode.QuickPickItem & {
  path: string
  uri: vscode.Uri
}

// Helper function to create a QuickPickItem for a file
function createFileQuickPickItem(
  fileUri: vscode.Uri,
  workspaceRoot: string,
  withRemoveButton: boolean = true
): QuickPickItemFile {
  const relativePath = path.relative(workspaceRoot, fileUri.fsPath)
  const buttons: vscode.QuickInputButton[] = []

  if (withRemoveButton) {
    buttons.push({
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: REMOVE_BUTTON_TOOLTIP
    })
  }

  return {
    label: path.basename(fileUri.fsPath),
    description: path.dirname(relativePath),
    path: relativePath,
    uri: fileUri,
    buttons
  }
}

function isSearching(value: string): boolean {
  return value.length > 0
}

export class RecentFileManager {
  private context: vscode.ExtensionContext

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  public setupListener(
    workspace_provider: WorkspaceProvider
  ): vscode.Disposable {
    function isIgnored(file_path: string): boolean {
      const workspace_root =
        workspace_provider.get_workspace_root_for_file(file_path)

      return workspace_root
        ? workspace_provider.is_excluded(
            path.relative(workspace_root, file_path)
          )
        : true
    }

    return vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.uri.scheme === 'file' && !isIgnored(document.uri.path)) {
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

  public async showFilePicker(workspace_root: string) {
    return new Promise<string | undefined>((resolve) => {
      const quickPick = vscode.window.createQuickPick<QuickPickItemFile>()
      quickPick.placeholder = 'Search for a file by name'

      let debounceTimeout: NodeJS.Timeout

      const recentFiles = this.getRecentFiles()
        .map((p) => createFileQuickPickItem(vscode.Uri.file(p), workspace_root))
        .filter((item) => fs.existsSync(item.uri.fsPath))

      // Initially, show only recent files
      quickPick.items = recentFiles

      quickPick.onDidChangeValue((value) => {
        clearTimeout(debounceTimeout)

        // When user clears the input, show recent files again
        if (!isSearching(value)) {
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
                workspace_root,
                this.getRecentFiles().includes(uri.fsPath)
              )
            )
          }
          quickPick.busy = false
        }, DEBOUNCE_DELAY)
      })

      quickPick.onDidTriggerItemButton((e) => {
        this.removeFile(e.item.uri)

        if (isSearching(quickPick.value)) {
          quickPick.items = quickPick.items.map((item) => {
            if (item.path === e.item.path) {
              item.buttons = []
            }

            return item
          })
        } else {
          quickPick.items = quickPick.items.filter(
            (item) => item.path !== e.item.path
          )
        }
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
