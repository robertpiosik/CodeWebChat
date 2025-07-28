import * as vscode from 'vscode'
import { WorkspaceProvider } from './providers/workspace-provider'
import { FileItem } from './providers/workspace-provider'
import { FilesCollector } from '../utils/files-collector'
import { OpenEditorsProvider } from './providers/open-editors-provider'
import { WebsitesProvider, WebsiteItem } from './providers/websites-provider'
import { SharedFileState } from './shared-file-state'
import { marked } from 'marked'
import { EventEmitter } from 'events'
import { apply_context_command } from '../commands/apply-context-command'

export const token_count_emitter = new EventEmitter()

export function context_initialization(context: vscode.ExtensionContext): {
  workspace_provider?: WorkspaceProvider
  open_editors_provider?: OpenEditorsProvider
  websites_provider?: WebsitesProvider
} {
  const workspace_folders = vscode.workspace.workspaceFolders

  let workspace_provider: WorkspaceProvider | undefined
  let workspace_view: vscode.TreeView<FileItem>

  if (!workspace_folders) {
    vscode.window.showInformationMessage('Please open a folder to use CWC.')
    return {}
  }

  workspace_provider = new WorkspaceProvider(workspace_folders as any, context)

  const open_editors_provider = new OpenEditorsProvider(
    workspace_folders as any,
    workspace_provider
  )
  const websites_provider = new WebsitesProvider(context)

  const websites_view = vscode.window.createTreeView(
    'codeWebChatViewWebsites',
    {
      treeDataProvider: websites_provider,
      manageCheckboxStateManually: true
    }
  )
  context.subscriptions.push(websites_provider, websites_view)

  const files_collector = new FilesCollector(
    workspace_provider,
    open_editors_provider,
    websites_provider
  )

  const update_activity_bar_badge_token_count = async () => {
    let total_token_count = 0

    if (workspace_provider) {
      total_token_count +=
        await workspace_provider.get_checked_files_token_count()
    }

    if (websites_provider) {
      total_token_count += websites_provider.get_checked_websites_token_count()
    }

    if (workspace_view) {
      workspace_view.badge = {
        value: total_token_count,
        tooltip: total_token_count
          ? `About ${total_token_count} tokens in context`
          : ''
      }
    }
    token_count_emitter.emit('token-count-updated')
  }

  websites_view.onDidChangeCheckboxState(async (e) => {
    for (const [item, state] of e.items) {
      await websites_provider!.update_check_state(item as WebsiteItem, state)
    }
    update_activity_bar_badge_token_count()
  })

  const shared_state = SharedFileState.get_instance()
  shared_state.set_providers(workspace_provider, open_editors_provider)

  workspace_provider.load_checked_files_state()
  websites_provider.load_checked_websites_state()

  context.subscriptions.push({
    dispose: () => shared_state.dispose()
  })

  const register_workspace_view_handlers = (
    view: vscode.TreeView<FileItem>
  ) => {
    view.onDidChangeCheckboxState(async (e) => {
      for (const [item, state] of e.items) {
        await workspace_provider!.update_check_state(item, state)
      }
    })

    // Fix for issue when the collapsed item has some of its children selected
    view.onDidCollapseElement(() => {
      workspace_provider!.refresh()
    })
  }

  workspace_view = vscode.window.createTreeView('codeWebChatViewWorkspace', {
    treeDataProvider: workspace_provider,
    manageCheckboxStateManually: true
  })

  register_workspace_view_handlers(workspace_view)

  const open_editors_view = vscode.window.createTreeView(
    'codeWebChatViewOpenEditors',
    {
      treeDataProvider: open_editors_provider,
      manageCheckboxStateManually: true
    }
  )

  context.subscriptions.push(
    workspace_provider,
    open_editors_provider,
    workspace_view,
    open_editors_view
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('codeWebChat.copyContext', async () => {
      let context_text = ''

      try {
        context_text = await files_collector.collect_files()
      } catch (error: any) {
        console.error('Error collecting files and websites:', error)
        vscode.window.showErrorMessage(
          'Error collecting files and websites: ' + error.message
        )
        return
      }

      if (context_text == '') {
        vscode.window.showWarningMessage(
          'No files or websites selected or open.'
        )
        return
      }

      context_text = `<files>\n${context_text}</files>\n`
      await vscode.env.clipboard.writeText(context_text)
      vscode.window.showInformationMessage(`Context copied to clipboard.`)
    }),
    vscode.commands.registerCommand('codeWebChat.collapseFolders', async () => {
      workspace_view.dispose()
      await new Promise((resolve) => setTimeout(resolve, 0))

      workspace_view = vscode.window.createTreeView(
        'codeWebChatViewWorkspace',
        {
          treeDataProvider: workspace_provider!,
          manageCheckboxStateManually: true
        }
      )

      register_workspace_view_handlers(workspace_view)
      context.subscriptions.push(workspace_view)
    }),
    vscode.commands.registerCommand('codeWebChat.clearChecks', () => {
      workspace_provider!.clear_checks()
    }),
    vscode.commands.registerCommand('codeWebChat.checkAll', async () => {
      await workspace_provider!.check_all()
    }),
    vscode.commands.registerCommand(
      'codeWebChat.clearChecksOpenEditors',
      () => {
        open_editors_provider!.clear_checks()
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.checkAllOpenEditors',
      async () => {
        await open_editors_provider!.check_all()
      }
    ),
    vscode.commands.registerCommand(
      'codeWebChat.previewWebsite',
      async (website: WebsiteItem) => {
        const panel = vscode.window.createWebviewPanel(
          'websitePreview',
          website.title,
          vscode.ViewColumn.One,
          { enableScripts: false }
        )

        const rendered_content = marked.parse(website.content)

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${website.title}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.4; max-width: 700px; margin: 0 auto; padding: 40px; color: var(--vscode-editor-foreground); }
                body > *:first-child { margin-top: 0; }
                body > *:last-child { margin-bottom: 0; }
                h1 { color: var(--vscode-editor-foreground); }
                a { color: var(--vscode-textLink-foreground); }
                hr { height: 1px; border: none; background-color: var(--vscode-editor-foreground); }
              </style>
            </head>
            <body>
              <h1>${website.title}</h1>
              <p>🔗 <a href="${website.url}" target="_blank">${website.url}</a></p>
              <hr>
              <div>${rendered_content}</div>
            </body>
            </html>
          `
      }
    ),
    apply_context_command(
      workspace_provider,
      () => {
        update_activity_bar_badge_token_count()
      },
      context
    )
  )

  open_editors_view.onDidChangeCheckboxState(async (e) => {
    for (const [item, state] of e.items) {
      await open_editors_provider!.update_check_state(item, state)
    }
  })

  context.subscriptions.push(
    workspace_provider.onDidChangeCheckedFiles(() => {
      update_activity_bar_badge_token_count()
    }),
    open_editors_provider.onDidChangeCheckedFiles(() => {
      update_activity_bar_badge_token_count()
    }),
    websites_provider.onDidChangeCheckedWebsites(() => {
      update_activity_bar_badge_token_count()
    }),
    // Fixes badge not updating when websites list changes
    websites_provider.onDidChangeTreeData(() => {
      update_activity_bar_badge_token_count()
    })
  )

  // Update badge when tabs change with debouncing to avoid multiple updates
  let tab_change_timeout: NodeJS.Timeout | null = null
  context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs(() => {
      if (tab_change_timeout) {
        clearTimeout(tab_change_timeout)
      }
      tab_change_timeout = setTimeout(() => {
        update_activity_bar_badge_token_count()
        tab_change_timeout = null
      }, 100) // 100ms debounce
    })
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (vscode.workspace.workspaceFolders) {
        const new_workspace_provider = new WorkspaceProvider(
          vscode.workspace.workspaceFolders as any,
          context
        )

        if (workspace_provider) {
          const checked_paths = workspace_provider.get_all_checked_paths()
          workspace_provider.dispose()
          workspace_provider = new_workspace_provider
          if (checked_paths.length > 0) {
            workspace_provider.set_checked_files(checked_paths)
          }
        } else {
          workspace_provider = new_workspace_provider
        }

        const old_view = workspace_view

        workspace_view = vscode.window.createTreeView(
          'codeWebChatViewWorkspace',
          {
            treeDataProvider: workspace_provider,
            manageCheckboxStateManually: true
          }
        )

        register_workspace_view_handlers(workspace_view)
        old_view.dispose()
        context.subscriptions.push(workspace_view)

        if (open_editors_provider) {
          shared_state.set_providers(workspace_provider, open_editors_provider)
        }
        update_activity_bar_badge_token_count()
      }
    })
  )

  workspace_view.onDidCollapseElement(() => {
    workspace_provider!.refresh()
  })

  context.subscriptions.push(
    open_editors_provider.onDidChangeTreeData(() => {
      if (open_editors_provider!.is_initialized()) {
        update_activity_bar_badge_token_count()
      }
    })
  )

  // Also schedule a delayed update for initial badge display
  setTimeout(() => {
    update_activity_bar_badge_token_count()
  }, 1000) // Wait for 1 second to ensure VS Code has fully loaded

  return {
    workspace_provider,
    open_editors_provider,
    websites_provider
  }
}
