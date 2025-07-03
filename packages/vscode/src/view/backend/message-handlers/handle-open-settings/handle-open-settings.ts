import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { configure_api_providers } from './configure-api-providers'
import { setup_api_tool_multi_config } from './setup-api-tool-multi-config'
import { setup_api_tool } from './setup-api-tool'

export const handle_open_settings = async (
  provider: ViewProvider
): Promise<void> => {
  const show_main_menu = async () => {
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: 'Configure API Providers',
          detail:
            'OpenAI-compatible API endpoints to use by API tools. API keys never leave your device.'
        },
        {
          label: 'API tools',
          kind: vscode.QuickPickItemKind.Separator
        },
        {
          label: 'Code Completions',
          description: 'Get code at cursor from state-of-the-art reasoning models.'
        },
        {
          label: 'Edit Context',
          description:
            'Create and modify files in context based on natural language instructions.'
        },
        {
          label: 'Intelligent Update',
          description:
            'Handle "truncated" edit format and fix malformed diffs.'
        },
        {
          label: 'Commit Messages',
          description:
            'Generate meaningful commit messages precisely adhering to your style.'
        }
      ],
      {
        title: 'Settings',
        placeHolder: 'Select option'
      }
    )

    if (!selected) {
      return
    }

    switch (selected.label) {
      case 'Configure API Providers':
        await configure_api_providers(provider)
        break
      case 'Code Completions':
        await setup_api_tool_multi_config({
          provider,
          tool: 'code-completions'
        })
        break
      case 'Edit Context':
        await setup_api_tool_multi_config({
          provider,
          tool: 'edit-context'
        })
        break
      case 'Intelligent Update':
        await setup_api_tool_multi_config({
          provider,
          tool: 'intelligent-update'
        })
        break
      case 'Commit Messages':
        await setup_api_tool({
          provider,
          tool: 'commit-messages'
        })
        break
    }

    // Return to main menu after completing any operation
    await show_main_menu()
  }

  await show_main_menu()
}
