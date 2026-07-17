import * as vscode from 'vscode'
import { webview_html } from '@/views/shared/utils/webview-html'
import { ApiManager } from '@/services/api-manager'

export class ApiManagerProvider implements vscode.WebviewViewProvider {
  public webview_view: vscode.WebviewView | undefined
  public api_manager!: ApiManager

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly context: vscode.ExtensionContext
  ) {}

  public set_api_manager(api_manager: ApiManager) {
    this.api_manager = api_manager
  }

  public send_message(message: any) {}

  async resolveWebviewView(
    webview_view: vscode.WebviewView,
    _: vscode.WebviewViewResolveContext,
    __: vscode.CancellationToken
  ) {
    this.webview_view = webview_view

    webview_view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    }

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    return webview_html({
      webview,
      extension_uri: this._extensionUri,
      name: 'api-manager',
      overflow_hidden: true
    })
  }
}
