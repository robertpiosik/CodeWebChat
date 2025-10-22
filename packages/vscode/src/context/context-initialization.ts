import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider, FileItem } from './providers/workspace-provider'
import { FilesCollector } from '../utils/files-collector'
import { OpenEditorsProvider } from './providers/open-editors-provider'
import { WebsitesProvider, WebsiteItem } from './providers/websites-provider'
import { SharedFileState } from './shared-file-state'
import { marked } from 'marked'
import { EventEmitter } from 'events'
import { apply_context_command } from '../commands/apply-context-command'
import { dictionary } from '@shared/constants/dictionary'
import { ContextProvider } from './providers/context-provider'

export const token_count_emitter = new EventEmitter()

const round_token_count_for_badge = (count: number): number => {
  if (count < 1000) {
    return count
  }
  return Math.floor(count / 1000) * 1000
}

export const context_initialization = (
  context: vscode.ExtensionContext
): {
  workspace_provider: WorkspaceProvider
  open_editors_provider: OpenEditorsProvider
  websites_provider: WebsitesProvider
} => {
  let was_above_threshold = false

  const workspace_folders = vscode.workspace.workspaceFolders ?? []

  let workspace_view: vscode.TreeView<FileItem>

  const websites_provider = new WebsitesProvider(context)
  const workspace_provider = new WorkspaceProvider(
    workspace_folders as any,
    context
  )
  const context_provider = new ContextProvider(workspace_provider)
  context.subscriptions.push(websites_provider, context_provider)

  const open_editors_provider = new OpenEditorsProvider(
    workspace_folders as any,
    workspace_provider
  )

  const files_collector = new FilesCollector(
    workspace_provider,
    open_editors_provider,
    websites_provider
  )

  const update_view_badges = async () => {
    let context_token_count = 0
    if (context_provider && context_view) {
      context_token_count =
        await workspace_provider.get_checked_files_token_count()
      workspace_view.badge = {
        value: round_token_count_for_badge(context_token_count),
        tooltip: context_token_count
          ? `About ${context_token_count} tokens in context`
          : ''
      }
      context_view.badge = undefined
    }

    let websites_token_count = 0
    if (websites_provider) {
      websites_token_count =
        websites_provider.get_checked_websites_token_count()
    }
    token_count_emitter.emit('token-count-updated')

    const total_token_count = context_token_count + websites_token_count
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const threshold = config.get<number>('contextSizeWarningThreshold')

    if (threshold && threshold > 0) {
      const is_above_threshold = total_token_count > threshold
      if (is_above_threshold && !was_above_threshold) {
        const percentage_over = Math.round(
          ((total_token_count - threshold) / threshold) * 100
        )
        const formatted_threshold =
          threshold >= 1000
            ? `${Math.round(threshold / 1000)}K`
            : `${threshold}`
        vscode.window.showWarningMessage(
          dictionary.warning_message.CONTEXT_SIZE_WARNING(
            formatted_threshold,
            percentage_over
          )
        )
      }
      was_above_threshold = is_above_threshold
    } else {
      was_above_threshold = false
    }
  }

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

  const context_view = vscode.window.createTreeView('codeWebChatViewContext', {
    treeDataProvider: context_provider,
    manageCheckboxStateManually: true
  })

  register_workspace_view_handlers(workspace_view)
  register_workspace_view_handlers(context_view)

  const open_editors_view = vscode.window.createTreeView(
    'codeWebChatViewOpenEditors',
    {
      treeDataProvider: open_editors_provider,
      manageCheckboxStateManually: true
    }
  )

  const websites_view = vscode.window.createTreeView(
    'codeWebChatViewWebsites',
    {
      treeDataProvider: websites_provider,
      manageCheckboxStateManually: true
    }
  )

  const update_websites_view_message = () => {
    websites_view.message =
      websites_provider.get_websites_count() > 0
        ? undefined
        : 'Websites added with the browser extension appear here.'
  }

  update_websites_view_message()

  websites_view.onDidChangeCheckboxState(async (e) => {
    for (const [item, state] of e.items) {
      if (item instanceof WebsiteItem) {
        await websites_provider.update_check_state(item, state)
      }
    }
  })

  context.subscriptions.push(
    workspace_provider,
    open_editors_provider,
    workspace_view,
    context_view,
    open_editors_view,
    websites_view
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('codeWebChat.copyContext', async () => {
      let context_text = ''

      try {
        context_text = await files_collector.collect_files()
      } catch (error: any) {
        console.error('Error collecting files and websites:', error)
        vscode.window.showErrorMessage(
          dictionary.error_message.ERROR_COLLECTING_FILES_AND_WEBSITES(
            error.message
          )
        )
        return
      }

      if (context_text == '') {
        vscode.window.showWarningMessage(
          dictionary.warning_message.NO_FILES_OR_WEBSITES_SELECTED
        )
        return
      }

      context_text = `<files>\n${context_text}</files>\n`
      await vscode.env.clipboard.writeText(context_text)
      vscode.window.showInformationMessage(
        dictionary.information_message.CONTEXT_COPIED_TO_CLIPBOARD
      )
    }),
    vscode.commands.registerCommand(
      'codeWebChat.copyContextOpenEditors',
      async () => {
        if (!open_editors_provider) return
        const checked_files = open_editors_provider.get_checked_files()

        if (checked_files.length === 0) {
          vscode.window.showWarningMessage(
            dictionary.warning_message.NO_OPEN_EDITORS_SELECTED
          )
          return
        }

        let context_text = ''
        const workspace_folders = vscode.workspace.workspaceFolders
        const is_multi_root =
          !!workspace_folders && workspace_folders.length > 1

        for (const file_path of checked_files) {
          try {
            const file_uri = vscode.Uri.file(file_path)
            const content_uint8_array = await vscode.workspace.fs.readFile(
              file_uri
            )
            const content = new TextDecoder().decode(content_uint8_array)

            let display_path: string
            const workspace_folder =
              vscode.workspace.getWorkspaceFolder(file_uri)

            if (is_multi_root && workspace_folder) {
              const relative_path = path.relative(
                workspace_folder.uri.fsPath,
                file_path
              )
              display_path = `${workspace_folder.name}:${relative_path}`
            } else {
              display_path = vscode.workspace.asRelativePath(file_path)
            }

            context_text += `<file path="${display_path.replace(
              /\\/g,
              '/'
            )}">\n${content}\n</file>\n`
          } catch (error: any) {
            vscode.window.showErrorMessage(
              dictionary.error_message.ERROR_READING_FILE(
                file_path,
                error.message
              )
            )
          }
        }

        if (context_text === '') return

        context_text = `<files>\n${context_text}</files>\n`
        await vscode.env.clipboard.writeText(context_text)
        vscode.window.showInformationMessage(
          dictionary.information_message
            .CONTEXT_FROM_OPEN_EDITORS_COPIED_TO_CLIPBOARD
        )
      }
    ),
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
    vscode.commands.registerCommand('codeWebChat.checkAllWebsites', () => {
      websites_provider.check_all()
    }),
    vscode.commands.registerCommand('codeWebChat.clearChecksWebsites', () => {
      websites_provider.clear_checks()
    }),
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
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.4; max-width: 700px; margin: 0 auto; padding: 40px; color: var(--vscode-foreground); }
                body > *:first-child { margin-top: 0; }
                body > *:last-child { margin-bottom: 0; }
                h1 { color: var(--vscode-foreground); }
                a { color: var(--vscode-textLink-foreground); }
                hr { height: 1px; border: none; background-color: var(--vscode-foreground); }
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
        update_view_badges()
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
      update_view_badges()
    }),
    open_editors_provider.onDidChangeCheckedFiles(() => {
      update_view_badges()
    }),
    websites_provider.onDidChangeCheckedWebsites(() => {
      update_view_badges()
    }),
    // Fixes badge not updating when websites list changes
    websites_provider.onDidChangeTreeData(() => {
      update_view_badges()
      update_websites_view_message()
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
        update_view_badges()
        tab_change_timeout = null
      }, 100) // 100ms debounce
    })
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      if (vscode.workspace.workspaceFolders) {
        await workspace_provider.update_workspace_folders(
          vscode.workspace.workspaceFolders
        )
        open_editors_provider.update_workspace_folders(
          vscode.workspace.workspaceFolders
        )
        shared_state.set_providers(workspace_provider, open_editors_provider)
        update_view_badges()
      }
    })
  )

  workspace_view.onDidCollapseElement(() => {
    workspace_provider!.refresh()
  })

  context.subscriptions.push(
    open_editors_provider.onDidChangeTreeData(() => {
      if (open_editors_provider!.is_initialized()) {
        update_view_badges()
      }
    })
  )

  // Also schedule a delayed update for initial badge display
  setTimeout(() => {
    update_view_badges()
  }, 1000) // Wait for 1 second to ensure VS Code has fully loaded

  return {
    workspace_provider,
    open_editors_provider,
    websites_provider
  }
}
