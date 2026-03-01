import * as vscode from 'vscode'
import axios from 'axios'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { make_api_request } from '@/utils/make-api-request'
import { display_token_count } from '@/utils/display-token-count'
import { Logger } from '@shared/utils/logger'
import { strip_wrapping_quotes } from './strip-wrapping-quotes'
import { CommitMessageConfig } from './get-commit-message-config'
import { t } from '@/i18n'

export const generate_commit_message_with_api = async (params: {
  endpoint_url: string
  provider: any
  config: CommitMessageConfig
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
    model: params.config.model,
    temperature: params.config.temperature
  }

  apply_reasoning_effort({
    body,
    provider: params.provider,
    reasoning_effort: params.config.reasoning_effort
  })

  const token_count = Math.ceil(params.message.length / 4)

  const cancel_token_source = axios.CancelToken.source()

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('command.commit-message.progress.title'),
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        cancel_token_source.cancel('Operation cancelled by user')
      })

      progress.report({
        message: t('common.progress.sent-tokens', {
          tokens: display_token_count(token_count)
        })
      })

      try {
        const response_result = await make_api_request({
          endpoint_url: params.endpoint_url,
          api_key: params.provider.api_key,
          body,
          cancellation_token: cancel_token_source.token,
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
