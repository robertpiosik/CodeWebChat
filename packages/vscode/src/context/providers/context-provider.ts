import * as vscode from 'vscode'
import { WorkspaceProvider, FileItem } from './workspace-provider'

export class ContextProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._onDidChangeTreeData.event

  private disposable: vscode.Disposable

  constructor(private workspaceProvider: WorkspaceProvider) {
    this.disposable = this.workspaceProvider.onDidChangeTreeData(() =>
      this.refresh()
    )
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: FileItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return this.workspaceProvider.getTreeItem(element)
  }

  getChildren(element?: FileItem): vscode.ProviderResult<FileItem[]> {
    return this.workspaceProvider.getContextViewChildren(element)
  }

  dispose() {
    this.disposable.dispose()
    this._onDidChangeTreeData.dispose()
  }
}
