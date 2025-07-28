import { Website } from '@shared/types/websocket-message'
import * as vscode from 'vscode'
import { CONTEXT_CHECKED_URLS_STATE_KEY } from '../../constants/state-keys'

export class WebsiteItem extends vscode.TreeItem {
  public readonly token_count: number

  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly content: string,
    public readonly favicon: string,
    public checkboxState: vscode.TreeItemCheckboxState = vscode
      .TreeItemCheckboxState.Unchecked
  ) {
    super(title, vscode.TreeItemCollapsibleState.None)

    const content_xml = `<text title="${title}">\n<![CDATA[\n${content}\n]]>\n</text>\n`
    this.token_count = Math.floor(content_xml.length / 4)
    const formatted_token_count =
      this.token_count >= 1000
        ? `${Math.floor(this.token_count / 1000)}k`
        : `${this.token_count}`

    this.tooltip = `${title} - About ${formatted_token_count} tokens`
    this.description = formatted_token_count

    if (favicon) {
      this.iconPath = vscode.Uri.parse(favicon)
    } else {
      this.iconPath = new vscode.ThemeIcon('globe')
    }

    this.command = {
      command: 'codeWebChat.previewWebsite',
      title: 'Preview Website Content',
      arguments: [this]
    }

    this.contextValue = 'website'
  }
}

export class EmptyMessageItem extends vscode.TreeItem {
  constructor() {
    super(
      'No websites available for context',
      vscode.TreeItemCollapsibleState.None
    )
    this.description = 'Use browser extension to add some'
    this.tooltip = 'Use browser extension to add some'
    this.iconPath = new vscode.ThemeIcon('info')
    this.contextValue = 'empty'
  }
}

export class WebsitesProvider
  implements
    vscode.TreeDataProvider<WebsiteItem | EmptyMessageItem>,
    vscode.Disposable
{
  private _websites: Website[] = []
  private _checked_websites: Map<string, vscode.TreeItemCheckboxState> =
    new Map()
  private _onDidChangeTreeData = new vscode.EventEmitter<
    WebsiteItem | EmptyMessageItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private _onDidChangeCheckedWebsites = new vscode.EventEmitter<void>()
  readonly onDidChangeCheckedWebsites = this._onDidChangeCheckedWebsites.event

  constructor(private context: vscode.ExtensionContext) {
    this.onDidChangeCheckedWebsites(() => this.save_checked_websites_state())
  }

  update_websites(websites: Website[]): void {
    const new_website_urls = new Set(websites.map((website) => website.url))

    for (const url of this._checked_websites.keys()) {
      if (!new_website_urls.has(url)) {
        this._checked_websites.delete(url)
      }
    }

    this._websites = websites
    this._onDidChangeTreeData.fire()
    this._onDidChangeCheckedWebsites.fire()
  }

  getTreeItem(element: WebsiteItem | EmptyMessageItem): vscode.TreeItem {
    if (element instanceof EmptyMessageItem) {
      return element
    }

    const checkbox_state =
      this._checked_websites.get(element.url) ??
      vscode.TreeItemCheckboxState.Unchecked
    element.checkboxState = checkbox_state
    return element
  }

  getChildren(): Thenable<(WebsiteItem | EmptyMessageItem)[]> {
    if (this._websites.length == 0) {
      return Promise.resolve([new EmptyMessageItem()])
    }

    return Promise.resolve(
      this._websites.map(
        (website) =>
          new WebsiteItem(
            website.title || website.url,
            website.url,
            website.content,
            website.favicon || '',
            this._checked_websites.get(website.url) ??
              vscode.TreeItemCheckboxState.Unchecked
          )
      )
    )
  }

  get_checked_websites(): Website[] {
    return this._websites.filter(
      (website) =>
        this._checked_websites.get(website.url) ===
        vscode.TreeItemCheckboxState.Checked
    )
  }

  get_checked_websites_token_count(): number {
    return this.get_checked_websites()
      .map((website) => {
        const content_xml = `<text title="${website.title}">\n<![CDATA[\n${website.content}\n]]>\n</text>\n`
        return Math.floor(content_xml.length / 4)
      })
      .reduce((sum, count) => sum + count, 0)
  }

  async update_check_state(
    item: WebsiteItem,
    state: vscode.TreeItemCheckboxState
  ): Promise<void> {
    this._checked_websites.set(item.url, state)
    this._onDidChangeCheckedWebsites.fire()
    this._onDidChangeTreeData.fire()
  }

  private async save_checked_websites_state(): Promise<void> {
    const checked_urls = this.get_checked_websites().map((w) => w.url)
    await this.context.workspaceState.update(
      CONTEXT_CHECKED_URLS_STATE_KEY,
      checked_urls
    )
  }

  public load_checked_websites_state(): void {
    const checked_urls = this.context.workspaceState.get<string[]>(
      CONTEXT_CHECKED_URLS_STATE_KEY
    )
    if (checked_urls) {
      for (const url of checked_urls) {
        this._checked_websites.set(url, vscode.TreeItemCheckboxState.Checked)
      }
      this._onDidChangeCheckedWebsites.fire()
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose()
    this._onDidChangeCheckedWebsites.dispose()
  }
}
