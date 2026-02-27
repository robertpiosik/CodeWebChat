import * as vscode from 'vscode'

export class CwcPreviewProvider implements vscode.TextDocumentContentProvider {
  static scheme = 'cwc-preview'
  private contents = new Map<string, string>()
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>()
  onDidChange = this.onDidChangeEmitter.event

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) || ''
  }

  setContent(uri: vscode.Uri, content: string) {
    this.contents.set(uri.toString(), content)
    this.onDidChangeEmitter.fire(uri)
  }

  deleteContent(uri: vscode.Uri) {
    this.contents.delete(uri.toString())
  }
}

export const preview_document_provider = new CwcPreviewProvider()
