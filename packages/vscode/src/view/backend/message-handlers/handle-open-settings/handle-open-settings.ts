import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { configure_api_providers } from './configure-api-providers'
import { setup_api_tool_multi_config } from './setup-api-tool-multi-config'
import { setup_api_tool } from './setup-api-tool'

export const handle_open_settings = async (
  provider: ViewProvider
): Promise<void> => {
  let show_menu = true
  while (show_menu) {
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: 'Configure API Providers',
          description:
            'Add OpenAI-compatible API endpoints to use by API tools',
          detail: 'API keys are stored encrypted and never leave your device.'
        },
        {
          label: 'API tools',
          kind: vscode.QuickPickItemKind.Separator
        },
        {
          label: 'API tool: Code Completions',
          description:
            'Get code at cursor from state-of-the-art reasoning models'
        },
        {
          label: 'API tool: Edit Context',
          description:
            'Create and modify files based on natural language instructions'
        },
        {
          label: 'API tool: Intelligent Update',
          description: 'Handle "truncated" edit format and fix malformed diffs'
        },
        {
          label: 'API tool: Commit Messages',
          description:
            'Generate meaningful commit messages adhering to your style'
        }
      ],
      {
        title: 'Settings',
        placeHolder: 'Select option'
      }
    )

    if (!selected) {
      show_menu = false
      continue
    }

    switch (selected.label) {
      case 'Configure API Providers':
        await configure_api_providers(provider)
        break
      case 'API tool: Code Completions':
        await setup_api_tool_multi_config({
          provider,
          tool: 'code-completions'
        })
        break
      case 'API tool: Edit Context':
        await setup_api_tool_multi_config({
          provider,
          tool: 'edit-context'
        })
        break
      case 'API tool: Intelligent Update':
        await setup_api_tool_multi_config({
          provider,
          tool: 'intelligent-update'
        })
        break
      case 'API tool: Commit Messages':
        await setup_api_tool({
          provider,
          tool: 'commit-messages'
        })
        break
    }
  }
}
