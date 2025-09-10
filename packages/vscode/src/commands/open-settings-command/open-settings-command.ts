import * as vscode from 'vscode'
import { api_providers } from './api-providers'
import { setup_api_tool_multi_config } from './setup-api-tool-multi-config'

const LABEL_PROVIDERS = '$(key) API Providers'
const LABEL_CODE_COMPLETIONS = '$(tools) Code Completions'
const LABEL_EDIT_CONTEXT = '$(tools) Edit Context'
const LABEL_INTELLIGENT_UPDATE = '$(tools) Intelligent Update'
const LABEL_COMMIT_MESSAGES = '$(tools) Commit Messages'
const LABEL_EDIT_SETTINGS = '$(settings) Open Settings'

export const open_settings_command = (context: vscode.ExtensionContext) => {
  const settings_command = vscode.commands.registerCommand(
    'codeWebChat.settings',
    async () => {
      let show_menu = true
      let last_selected_label: string | undefined

      while (show_menu) {
        const items: vscode.QuickPickItem[] = [
          {
            label: LABEL_EDIT_SETTINGS,
            detail:
              'Modify "edit format" instructions, edit chat presets in JSON and more.'
          },
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
            detail:
              'Get accurate code-at-cursor from state-of-the-art reasoning models.'
          },
          {
            label: LABEL_EDIT_CONTEXT,
            detail: 'Modify files based on natural language instructions.'
          },
          {
            label: LABEL_INTELLIGENT_UPDATE,
            detail: 'Integrate truncated code blocks and fix malformed diffs.'
          },
          {
            label: LABEL_COMMIT_MESSAGES,
            detail:
              'Generate meaningful summaries of changes adhering to your preferred style.'
          }
        ]

        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = items
        quick_pick.title = 'Settings'
        quick_pick.placeholder = 'Select option'

        if (last_selected_label) {
          const active_item = items.find(
            (item) => item.label === last_selected_label
          )
          if (active_item) {
            quick_pick.activeItems = [active_item]
          }
        }

        const selected = await new Promise<vscode.QuickPickItem | undefined>(
          (resolve) => {
            let is_accepted = false
            quick_pick.onDidAccept(() => {
              is_accepted = true
              resolve(quick_pick.selectedItems[0])
              quick_pick.hide()
            })
            quick_pick.onDidHide(() => {
              if (!is_accepted) {
                resolve(undefined)
              }
              quick_pick.dispose()
            })
            quick_pick.show()
          }
        )

        if (!selected) {
          show_menu = false
          continue
        }

        last_selected_label = selected.label

        switch (selected.label) {
          case LABEL_EDIT_SETTINGS:
            await vscode.commands.executeCommand(
              'workbench.action.openSettings',
              '@ext:robertpiosik.gemini-coder'
            )
            show_menu = false
            break
          case LABEL_PROVIDERS:
            show_menu = await api_providers(context)
            break
          case LABEL_CODE_COMPLETIONS:
            show_menu = await setup_api_tool_multi_config({
              context,
              tool: 'code-completions',
              show_back_button: true
            })
            break
          case LABEL_EDIT_CONTEXT:
            show_menu = await setup_api_tool_multi_config({
              context,
              tool: 'edit-context',
              show_back_button: true
            })
            break
          case LABEL_INTELLIGENT_UPDATE:
            show_menu = await setup_api_tool_multi_config({
              context,
              tool: 'intelligent-update',
              show_back_button: true
            })
            break
          case LABEL_COMMIT_MESSAGES:
            show_menu = await setup_api_tool_multi_config({
              context,
              tool: 'commit-messages',
              show_back_button: true
            })
            break
        }
      }
    }
  )

  const code_completions_config_command = vscode.commands.registerCommand(
    'codeWebChat.settings.codeCompletions',
    () =>
      setup_api_tool_multi_config({
        context,
        tool: 'code-completions',
        show_back_button: false
      })
  )

  const edit_context_config_command = vscode.commands.registerCommand(
    'codeWebChat.settings.editContext',
    () =>
      setup_api_tool_multi_config({
        context,
        tool: 'edit-context',
        show_back_button: false
      })
  )

  const intelligent_update_config_command = vscode.commands.registerCommand(
    'codeWebChat.settings.intelligentUpdate',
    () =>
      setup_api_tool_multi_config({
        context,
        tool: 'intelligent-update',
        show_back_button: false
      })
  )

  const commit_messages_config_command = vscode.commands.registerCommand(
    'codeWebChat.settings.commitMessages',
    () =>
      setup_api_tool_multi_config({
        context,
        tool: 'commit-messages',
        show_back_button: false
      })
  )

  return [
    settings_command,
    code_completions_config_command,
    edit_context_config_command,
    intelligent_update_config_command,
    commit_messages_config_command
  ]
}
