import * as vscode from 'vscode'
import axios from 'axios'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { dictionary } from '@shared/constants/dictionary'
import { make_api_request } from '@/utils/make-api-request'
import { process_single_trailing_dot } from '@/utils/process-single-trailing-dot/process-single-trailing-dot'
import { Logger } from '@shared/utils/logger'
import { strip_wrapping_quotes } from './strip-wrapping-quotes'
import { CommitMessageConfig } from './get-commit-message-config'

export const generate_commit_message_with_api = async (params: {
  endpoint_url: string
  provider: any
  config: CommitMessageConfig
  message: string
}): Promise<string | null> => {
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
  } as any

  apply_reasoning_effort(body, params.provider, params.config.reasoning_effort)

  const cancel_token_source = axios.CancelToken.source()

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: dictionary.api_call.WAITING_FOR_RESPONSE,
      cancellable: true
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        cancel_token_source.cancel('Operation cancelled by user')
      })

      let wait_time = 0
      const wait_timer = setInterval(() => {
        progress.report({
          message: `${(wait_time / 10).toFixed(1)}s`
        })
        wait_time++
      }, 100)

      try {
        const response_result = await make_api_request({
          endpoint_url: params.endpoint_url,
          api_key: params.provider.api_key,
          body,
          cancellation_token: cancel_token_source.token
        })

        if (!response_result) {
          if (token.isCancellationRequested) {
            return null
          }
          vscode.window.showErrorMessage(
            dictionary.error_message.FAILED_TO_GENERATE_COMMIT_MESSAGE
          )
          return null
        } else {
          let commit_message = process_single_trailing_dot(
            response_result.response
          )
          commit_message = strip_wrapping_quotes(commit_message)
          // Sanitize to prevent shell syntax errors
          commit_message = commit_message.replace(/[<>`$()]/g, '')
          return commit_message
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          return null
        }
        Logger.error({
          function_name: 'generate_commit_message_with_api',
          message: 'Error during API request',
          data: error
        })
        throw error
      } finally {
        clearInterval(wait_timer)
      }
    }
  )
}
