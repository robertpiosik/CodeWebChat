import * as vscode from 'vscode'
import { configure_api_providers } from './configure-api-providers'
import { setup_api_tool_multi_config } from './setup-api-tool-multi-config'
import { setup_api_tool } from './setup-api-tool'

const LABEL_PROVIDERS = '$(key) Configure API Providers'
const LABEL_CODE_COMPLETIONS = 'Code Completions'
const LABEL_EDIT_CONTEXT = 'Edit Context'
const LABEL_INTELLIGENT_UPDATE = 'Intelligent Update'
const LABEL_COMMIT_MESSAGES = 'Commit Messages'

export const open_settings_command = (context: vscode.ExtensionContext) => {
  return vscode.commands.registerCommand('codeWebChat.settings', async () => {
    let show_menu = true
    while (show_menu) {
      const selected = await vscode.window.showQuickPick(
        [
          {
            label: LABEL_PROVIDERS,
            detail: 'API keys are stored encrypted and never leave your device.'
          },
          {
            label: 'API tools',
            kind: vscode.QuickPickItemKind.Separator
          },
          {
            label: LABEL_CODE_COMPLETIONS,
            description: 'API tool',
            detail: 'Get code at cursor from state-of-the-art reasoning models.'
          },
          {
            label: LABEL_EDIT_CONTEXT,
            description: 'API tool',
            detail:
              'Create and modify files based on natural language instructions.'
          },
          {
            label: LABEL_INTELLIGENT_UPDATE,
            description: 'API tool',
            detail: 'Handle "truncated" edit format and fix malformed diffs.'
          },
          {
            label: LABEL_COMMIT_MESSAGES,
            description: 'API tool',
            detail: 'Generate meaningful commit messages adhering to your style.'
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
        case LABEL_PROVIDERS:
          await configure_api_providers(context)
          break
        case LABEL_CODE_COMPLETIONS:
          await setup_api_tool_multi_config({
            context,
            tool: 'code-completions'
          })
          break
        case LABEL_EDIT_CONTEXT:
          await setup_api_tool_multi_config({
            context,
            tool: 'edit-context'
          })
          break
        case LABEL_INTELLIGENT_UPDATE:
          await setup_api_tool_multi_config({
            context,
            tool: 'intelligent-update'
          })
          break
        case LABEL_COMMIT_MESSAGES:
          await setup_api_tool({
            context,
            tool: 'commit-messages'
          })
          break
      }
    }
  })
}
