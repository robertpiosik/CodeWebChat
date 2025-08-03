import * as vscode from 'vscode'
import * as fs from 'fs'
import { RECENT_FILES_STORAGE_KEY } from '@/constants/state-keys'

const MAX_RECENT_FILES = 50

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

  public getRecentFileUris(): vscode.Uri[] {
    const paths = this.context.workspaceState.get<string[]>(
      RECENT_FILES_STORAGE_KEY,
      []
    )
    return paths
      .map((p) => vscode.Uri.file(p))
      .filter((uri) => fs.existsSync(uri.fsPath))
  }
}
