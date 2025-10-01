import * as vscode from 'vscode'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'
import axios from 'axios'
import {
  get_intelligent_update_config,
  process_file
} from '../utils/intelligent-update-utils'
import { dictionary } from '@shared/constants/dictionary'
import {
  LAST_REFACTOR_INSTRUCTION_SOURCE_STATE_KEY,
  LAST_REFACTOR_INSTRUCTION_STATE_KEY
} from '../constants/state-keys'
import { Logger } from '@shared/utils/logger'

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

      const last_instruction_source = context.workspaceState.get<string>(
        LAST_REFACTOR_INSTRUCTION_SOURCE_STATE_KEY
      )
      const last_instruction = context.workspaceState.get<string>(
        LAST_REFACTOR_INSTRUCTION_STATE_KEY
      )

      if (!clipboard_content) {
        instruction = await vscode.window.showInputBox({
          prompt: 'Enter your refactoring instructions',
          value: last_instruction
        })
        if (instruction) {
          await context.workspaceState.update(
            LAST_REFACTOR_INSTRUCTION_STATE_KEY,
            instruction
          )
          await context.workspaceState.update(
            LAST_REFACTOR_INSTRUCTION_SOURCE_STATE_KEY,
            'Instructions'
          )
        }
      } else {
        const choice = await new Promise<string | undefined>((resolve) => {
          const quick_pick = vscode.window.createQuickPick()
          const items = [{ label: 'Clipboard' }, { label: 'Instructions' }]
          quick_pick.items = items
          quick_pick.placeholder =
            'Use clipboard content or enter new refactoring instructions?'

          if (last_instruction_source) {
            const active_item = items.find(
              (item) => item.label === last_instruction_source
            )
            if (active_item) {
              quick_pick.activeItems = [active_item]
            }
          }

          quick_pick.onDidAccept(() => {
            const selected = quick_pick.selectedItems[0]
            resolve(selected?.label)
            quick_pick.hide()
          })

          quick_pick.onDidHide(() => {
            quick_pick.dispose()
            resolve(undefined)
          })

          quick_pick.show()
        })

        if (choice === undefined) {
          return // User cancelled
        }

        await context.workspaceState.update(
          LAST_REFACTOR_INSTRUCTION_SOURCE_STATE_KEY,
          choice
        )

        if (choice == 'Clipboard') {
          instruction = clipboard_content
        } else if (choice == 'Instructions') {
          instruction = await vscode.window.showInputBox({
            prompt: 'Enter your refactoring instructions',
            value: last_instruction
          })
          if (instruction) {
            await context.workspaceState.update(
              LAST_REFACTOR_INSTRUCTION_STATE_KEY,
              instruction
            )
          }
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
      const cancel_token_source = axios.CancelToken.source()

      let thinking_reported = false
      let resolve_thinking: () => void
      const thinking_promise = new Promise<void>((resolve) => {
        resolve_thinking = resolve
      })

      const on_thinking_chunk = () => {
        if (!thinking_reported) {
          thinking_reported = true
          resolve_thinking()
        }
      }

      let receiving_reported = false
      let resolve_receiving: () => void
      const receiving_promise = new Promise<void>((resolve) => {
        resolve_receiving = resolve
      })

      const on_chunk = () => {
        if (!receiving_reported) {
          receiving_reported = true
          resolve_receiving()
        }
      }

      const content_promise = process_file({
        endpoint_url,
        api_key: provider.api_key,
        provider,
        model: intelligent_update_config.model,
        temperature: intelligent_update_config.temperature,
        reasoning_effort: intelligent_update_config.reasoning_effort,
        file_path: file_path,
        file_content: original_content,
        instruction,
        cancel_token: cancel_token_source.token,
        on_thinking_chunk,
        on_chunk
      })

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: dictionary.api_call.WAITING_FOR_API_RESPONSE,
            cancellable: true
          },
          async (progress, token) => {
            token.onCancellationRequested(() => {
              cancel_token_source.cancel('User cancelled the operation')
            })

            let wait_time = 0
            const wait_timer = setInterval(() => {
              progress.report({
                message: `${(wait_time / 10).toFixed(1)}s`
              })
              wait_time++
            }, 100)

            await Promise.race([
              content_promise,
              thinking_promise,
              receiving_promise
            ])
            clearInterval(wait_timer)
          }
        )

        if (thinking_reported && !receiving_reported) {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: dictionary.api_call.THINKING,
              cancellable: true
            },
            async (progress, token) => {
              token.onCancellationRequested(() => {
                cancel_token_source.cancel('User cancelled the operation')
              })

              let thinking_time = 0
              const thinking_timer = setInterval(() => {
                progress.report({
                  message: `${(thinking_time / 10).toFixed(1)}s`
                })
                thinking_time++
              }, 100)

              try {
                await Promise.race([content_promise, receiving_promise])
              } finally {
                clearInterval(thinking_timer)
              }
            }
          )
        }

        if (receiving_reported) {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: dictionary.api_call.RECEIVING_RESPONSE,
              cancellable: true
            },
            async (progress, token) => {
              token.onCancellationRequested(() => {
                cancel_token_source.cancel('User cancelled the operation')
              })

              let receiving_time = 0
              const receiving_timer = setInterval(() => {
                progress.report({
                  message: `${(receiving_time / 10).toFixed(1)}s`
                })
                receiving_time++
              }, 100)

              try {
                await content_promise
              } finally {
                clearInterval(receiving_timer)
              }
            }
          )
        }

        const updated_content = await content_promise

        if (updated_content) {
          const relative_path = vscode.workspace.asRelativePath(document.uri)
          const response_for_apply = `\`\`\`\n// ${relative_path}\n${updated_content}\n\`\`\``

          await vscode.commands.executeCommand(
            'codeWebChat.applyChatResponse',
            {
              response: response_for_apply,
              suppress_fast_replace_inaccuracies_dialog: true
            }
          )

          await vscode.window.showInformationMessage(
            dictionary.information_message
              .CLIPBOARD_CONTENT_APPLIED_SUCCESSFULLY
          )
        }
      } catch (err: any) {
        Logger.error({
          function_name: 'refactorCurrentFile',
          message: 'Refactor error',
          data: err
        })
      }
    }
  )
}
