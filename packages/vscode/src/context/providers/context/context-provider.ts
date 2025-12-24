import * as vscode from 'vscode'
import { WorkspaceProvider, FileItem } from '../workspace/workspace-provider'

export class ContextProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    FileItem | undefined | null | void
  > = new vscode.EventEmitter<FileItem | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<
    FileItem | undefined | null | void
  > = this._onDidChangeTreeData.event

  private _disposable: vscode.Disposable

  constructor(private _workspace_provider: WorkspaceProvider) {
    this._disposable = this._workspace_provider.onDidChangeTreeData(() =>
      this.refresh()
    )
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: FileItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return this._workspace_provider.getTreeItem(element)
  }

  getChildren(element?: FileItem): vscode.ProviderResult<FileItem[]> {
    return this._workspace_provider.getContextViewChildren(element)
  }

  dispose() {
    this._disposable.dispose()
    this._onDidChangeTreeData.dispose()
  }
}
