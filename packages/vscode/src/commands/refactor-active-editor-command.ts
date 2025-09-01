import * as vscode from 'vscode'
import { ApiProvidersManager } from '@/services/api-providers-manager'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../constants/state-keys'
import { PROVIDERS } from '@shared/constants/providers'
import axios from 'axios'
import { OriginalFileState } from '@/types/common'
import { ViewProvider } from '../view/backend/view-provider'
import {
  get_intelligent_update_config,
  process_file
} from '../utils/intelligent-update-utils'

export const refactor_active_editor_command = (
  context: vscode.ExtensionContext,
  view_provider: ViewProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.refactorActiveEditor',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found.')
        return
      }

      const instructions = await vscode.window.showInputBox({
        prompt: 'Enter refactoring instructions',
        placeHolder:
          'e.g., "rename variable x to y", "extract this logic into a function"'
      })

      if (!instructions) {
        return
      }

      const api_providers_manager = new ApiProvidersManager(context)
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
            title: `Called Intelligent Update tool for file refactoring...`,
            cancellable: true
          },
          async (progress, token) => {
            const cancel_token_source = axios.CancelToken.source()
            token.onCancellationRequested(() => {
              cancel_token_source.cancel('Cancelled by user.')
            })

            let previous_progress = 0

            const content = await process_file({
              endpoint_url,
              api_key: provider.api_key,
              model: intelligent_update_config.model,
              temperature: intelligent_update_config.temperature,
              reasoning_effort: intelligent_update_config.reasoning_effort,
              file_path: file_path,
              file_content: original_content,
              instruction: instructions,
              cancel_token: cancel_token_source.token,
              on_progress: (receivedLength, totalLength) => {
                const current_progress = Math.min(
                  Math.round((receivedLength / totalLength) * 100),
                  100
                )
                const increment = current_progress - previous_progress
                if (increment > 0) {
                  progress.report({
                    increment
                  })
                  previous_progress = current_progress
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
        const original_state: OriginalFileState = {
          file_path: vscode.workspace.asRelativePath(document.uri),
          content: original_content,
          is_new: false,
          workspace_name: vscode.workspace.getWorkspaceFolder(document.uri)
            ?.name
        }

        await editor.edit((editBuilder) => {
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(original_content.length)
          )
          editBuilder.replace(fullRange, updated_content)
        })

        await vscode.commands.executeCommand('editor.action.formatDocument')
        await document.save()

        context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, [
          original_state
        ])
        view_provider.set_revert_button_state(true)
        view_provider.set_apply_button_state(false)

        const response = await vscode.window.showInformationMessage(
          'File refactored successfully.',
          'Revert'
        )
        if (response == 'Revert') {
          await vscode.commands.executeCommand('codeWebChat.revert')
        }
      } else {
        vscode.window.showErrorMessage(
          'Refactoring failed to produce any content.'
        )
      }
    }
  )
}
