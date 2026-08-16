import * as vscode from 'vscode'
import axios from 'axios'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { send_llm_message } from '@/utils/send-llm-message'
import { display_token_count } from '@/utils/display-token-count'
import { Logger } from '@shared/utils/logger'
import { strip_wrapping_quotes } from './strip-wrapping-quotes'
import { ModelProvider } from '@/services/model-providers-manager'
import { t } from '@/i18n'
import { CommitMessageApiConfiguration } from './get-commit-message-config'

export const generate_commit_message_with_api = async (params: {
  base_url: string
  model_provider: ModelProvider
  api_configuration: CommitMessageApiConfiguration
  message: string
}): Promise<string> => {
  const messages = [
    {
      role: 'user',
      content: params.message
    }
  ]

  const body = {
    messages,
    model: params.api_configuration.model
  }

  apply_reasoning_effort({
    body,
    model_provider: params.model_provider,
    reasoning_effort: params.api_configuration.reasoning_effort
  })

  const token_count = Math.ceil(params.message.length / 4)

  const abort_controller = new AbortController()

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('command.generate-commit-message.progress.title'),
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        abort_controller.abort('Operation cancelled by user')
      })

      progress.report({
        message: t('common.progress.sent-tokens', {
          tokens: display_token_count(token_count)
        })
      })

      try {
        const response_result = await send_llm_message({
          base_url: params.base_url,
          api_key: params.model_provider.api_key,
          body,
          abort_signal: abort_controller.signal,
          on_chunk: () => {
            progress.report({ message: t('common.progress.receiving') })
          },
          on_thinking_chunk: () => {
            progress.report({ message: t('common.progress.thinking') })
          }
        })

        if (!response_result) {
          if (token.isCancellationRequested) {
            throw new axios.Cancel('Operation cancelled by user')
          }
          throw new Error('API request failed to return a response')
        }

        let commit_message = response_result.response
        commit_message = strip_wrapping_quotes(commit_message)
        // Sanitize to prevent shell syntax errors
        commit_message = commit_message.replace(/[<>`$()]/g, '')

        if (!commit_message.trim()) {
          throw new Error('API request returned an empty response')
        }

        return commit_message
      } catch (error) {
        Logger.error({
          function_name: 'generate_commit_message_with_api',
          message: 'Error during API request',
          data: error
        })
        throw error
      }
    }
  )
}
