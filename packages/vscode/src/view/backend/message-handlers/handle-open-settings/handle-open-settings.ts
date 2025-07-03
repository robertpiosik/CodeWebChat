import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { configure_api_providers } from './configure-api-providers'
import { setup_api_tool_multi_config } from './setup-api-tool-multi-config'
import { setup_api_tool } from './setup-api-tool'

const LABEL_API_PROVIDERS = '$(key) API Providers'
const LABEL_CODE_COMPLETIONS = 'API tool: Code Completions'
const LABEL_EDIT_CONTEXT = 'API tool: Edit Context'
const LABEL_INTELLIGENT_UPDATE = 'API tool: Intelligent Update'
const LABEL_COMMIT_MESSAGES = 'API tool: Commit Messages'

export const handle_open_settings = async (
  provider: ViewProvider
): Promise<void> => {
  let show_menu = true
  while (show_menu) {
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: LABEL_API_PROVIDERS,
          description:
            'Add OpenAI-compatible API endpoints to use by API tools',
          detail: 'API keys are stored encrypted and never leave your device.'
        },
        {
          label: LABEL_CODE_COMPLETIONS,
          description:
            'Get code at cursor from state-of-the-art reasoning models'
        },
        {
          label: LABEL_EDIT_CONTEXT,
          description:
            'Create and modify files based on natural language instructions'
        },
        {
          label: LABEL_INTELLIGENT_UPDATE,
          description: 'Handle "truncated" edit format and fix malformed diffs'
        },
        {
          label: LABEL_COMMIT_MESSAGES,
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
      case LABEL_API_PROVIDERS:
        await configure_api_providers(provider)
        break
      case LABEL_CODE_COMPLETIONS:
        await setup_api_tool_multi_config({
          provider,
          tool: 'code-completions'
        })
        break
      case LABEL_EDIT_CONTEXT:
        await setup_api_tool_multi_config({
          provider,
          tool: 'edit-context'
        })
        break
      case LABEL_INTELLIGENT_UPDATE:
        await setup_api_tool_multi_config({
          provider,
          tool: 'intelligent-update'
        })
        break
      case LABEL_COMMIT_MESSAGES:
        await setup_api_tool({
          provider,
          tool: 'commit-messages'
        })
        break
    }
  }
}
