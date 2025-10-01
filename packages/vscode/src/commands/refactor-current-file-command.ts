import * as vscode from 'vscode'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'
import axios from 'axios'
import {
  get_intelligent_update_config,
  process_file
} from '../utils/intelligent-update-utils'
import { dictionary } from '@shared/constants/dictionary'

export const refactor_current_file_command = (
  context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.refactorCurrentFile',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showInformationMessage(
          dictionary.information_message.NO_ACTIVE_EDITOR_FOUND
        )
        return
      }

      let instruction: string | undefined
      const clipboard_content = await vscode.env.clipboard.readText()
      if (!clipboard_content) {
        instruction = await vscode.window.showInputBox({
          prompt: 'Enter your refactoring instructions'
        })
      } else {
        const choice = await vscode.window.showQuickPick(
          ['Clipboard', 'Instructions'],
          {
            placeHolder:
              'Use clipboard content or enter new refactoring instructions?'
          }
        )

        if (choice == 'Clipboard') {
          instruction = clipboard_content
        } else if (choice == 'Instructions') {
          instruction = await vscode.window.showInputBox({
            prompt: 'Enter your refactoring instructions'
          })
        }
      }

      if (!instruction) {
        return
      }

      const api_providers_manager = new ModelProvidersManager(context)
      const config_result = await get_intelligent_update_config(
        api_providers_manager,
        false,
        context
      )

      if (!config_result) {
        return
      }

      const { provider, config: intelligent_update_config } = config_result

      let endpoint_url = ''
      if (provider.type == 'built-in') {
        const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
        endpoint_url = provider_info.base_url
      } else {
        endpoint_url = provider.base_url
      }

      const document = editor.document
      const original_content = document.getText()
      const file_path = document.uri.fsPath

      let result: any
      try {
        result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Refactoring current file`,
            cancellable: true
          },
          async (progress, token) => {
            const cancel_token_source = axios.CancelToken.source()
            token.onCancellationRequested(() => {
              cancel_token_source.cancel('Cancelled by user.')
            })

            let previous_progress = 0
            const estimated_total_tokens = Math.ceil(
              original_content.length / 4
            )

            const content = await process_file({
              endpoint_url,
              api_key: provider.api_key,
              model: intelligent_update_config.model,
              temperature: intelligent_update_config.temperature,
              reasoning_effort: intelligent_update_config.reasoning_effort,
              file_path: file_path,
              file_content: original_content,
              instruction,
              cancel_token: cancel_token_source.token,
              on_chunk: (tokens_per_second, total_tokens) => {
                if (estimated_total_tokens > 0) {
                  const current_progress = Math.min(
                    Math.round((total_tokens / estimated_total_tokens) * 100),
                    100
                  )
                  const increment = current_progress - previous_progress
                  if (increment > 0) {
                    progress.report({
                      increment,
                      message: `~${tokens_per_second} tokens/s`
                    })
                    previous_progress = current_progress
                  }
                }
              }
            })

            return {
              content,
              cancelled: token.isCancellationRequested
            }
          }
        )
      } catch (error) {
        if (axios.isCancel(error)) {
          return
        }
        throw error
      }

      if (result.cancelled) {
        return
      }

      const updated_content = result.content

      if (updated_content) {
        const relative_path = vscode.workspace.asRelativePath(document.uri)
        const response_for_apply = `\`\`\`\n// ${relative_path}\n${updated_content}\n\`\`\``

        await vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
          response: response_for_apply,
          suppress_fast_replace_inaccuracies_dialog: true
        })

        await vscode.window.showInformationMessage(
          dictionary.information_message.CLIPBOARD_CONTENT_APPLIED_SUCCESSFULLY
        )
      } else {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_APPLY_CLIPBOARD_CONTENT
        )
      }
    }
  )
}
