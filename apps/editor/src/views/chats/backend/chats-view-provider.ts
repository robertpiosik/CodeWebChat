import * as vscode from 'vscode'
import { webview_html } from '@/views/shared/utils/webview-html'
import { ApiManager } from '@/services/api-manager'
import { BackendMessage, FrontendMessage } from '../types/messages'
import { CHATS_VIEW_CHAT_HISTORY_STATE_KEY } from '@/constants/state-keys'
import { handle_delete_chat } from './message-handlers/handle-delete-chat'
import { handle_get_chats } from './message-handlers/handle-get-chats'

export interface ApiChatResult {
  timestamp: number
  provider_name: string
  model?: string
  reasoning_effort?: string
  raw_instructions: string
  response: string
  thoughts?: string
}

export class ChatsViewProvider implements vscode.WebviewViewProvider {
  public webview_view: vscode.WebviewView | undefined
  public api_manager!: ApiManager
  public chats: ApiChatResult[] = []

  constructor(
    private readonly _extensionUri: vscode.Uri,
    public readonly extension_context: vscode.ExtensionContext
  ) {
    this.chats =
      this.extension_context.workspaceState.get<ApiChatResult[]>(
        CHATS_VIEW_CHAT_HISTORY_STATE_KEY
      ) || []
  }

  public set_api_manager(api_manager: ApiManager) {
    this.api_manager = api_manager
  }

  public add_chat(chat: ApiChatResult) {
    this.chats.push(chat)
    this.extension_context.workspaceState.update(
      CHATS_VIEW_CHAT_HISTORY_STATE_KEY,
      this.chats
    )
    this.send_message({
      command: 'CHATS',
      chats: this.chats
    })
  }

  public send_message(message: BackendMessage) {
    if (this.webview_view) {
      this.webview_view.webview.postMessage(message)
    }
  }

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

    webview_view.webview.onDidReceiveMessage((message: FrontendMessage) => {
      if (message.command == 'CANCEL_API_MANAGER_REQUEST') {
        this.api_manager.cancel_api_call(message.id)
      } else if (message.command == 'GET_CHATS') {
        handle_get_chats(this)
      } else if (message.command == 'DELETE_CHAT') {
        handle_delete_chat(this, message)
      }
    })

    webview_view.webview.html = this._get_html_for_webview(webview_view.webview)
  }

  private _get_html_for_webview(webview: vscode.Webview) {
    return webview_html({
      webview,
      extension_uri: this._extensionUri,
      name: 'chats',
      overflow_hidden: true
    })
  }
}
