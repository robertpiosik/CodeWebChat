import * as vscode from 'vscode'
import { GitRepository } from '@/utils/git-repository-utils'
import { ViewProvider } from '../../../panel-provider'
import {
  get_commit_message_config,
  CommitMessageConfig
} from './get-commit-message-config'
import {
  get_ignored_extensions,
  collect_affected_files_with_metadata
} from './file-utils'
import { handle_file_selection_if_needed } from './handle-file-selection'
import {
  build_files_content,
  build_commit_message_prompt
} from './prompt-utils'
import axios from 'axios'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { make_api_request } from '@/utils/make-api-request'
import { process_single_trailing_dot } from '@/utils/process-single-trailing-dot/process-single-trailing-dot'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { display_token_count } from '@/utils/display-token-count'
import { strip_wrapping_quotes } from './prompt-utils'

const generate_commit_message_with_api = async (params: {
  endpoint_url: string
  provider: any
  config: CommitMessageConfig
  message: string
  view_provider?: ViewProvider
}): Promise<string | null> => {
  const token_count = Math.ceil(params.message.length / 4)
  const formatted_token_count = display_token_count(token_count)
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

  Logger.info({
    function_name: 'generate_commit_message_with_api',
    message: `Estimated tokens: ${formatted_token_count}`
  })

  if (params.view_provider) {
    params.view_provider.api_call_cancel_token_source = cancel_token_source
    try {
      params.view_provider.send_message({
        command: 'SHOW_PROGRESS',
        title: `${dictionary.api_call.WAITING_FOR_API_RESPONSE}...`
      })

      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.provider.api_key,
        body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          if (params.view_provider) {
            params.view_provider.send_message({
              command: 'SHOW_PROGRESS',
              title: `${dictionary.api_call.THINKING}...`
            })
          }
        }
      })

      if (!result) {
        if (cancel_token_source.token.reason) {
          return null
        }
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_GENERATE_COMMIT_MESSAGE
        )
        return null
      } else {
        let commit_message = process_single_trailing_dot(result.response)
        commit_message = strip_wrapping_quotes(commit_message)
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
      params.view_provider.send_message({ command: 'HIDE_PROGRESS' })
      params.view_provider.api_call_cancel_token_source = null
    }
  } else {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: dictionary.api_call.WAITING_FOR_API_RESPONSE,
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
}

export const generate_commit_message_from_diff = async (params: {
  context: vscode.ExtensionContext
  repository: GitRepository
  diff: string
  api_config?: {
    config: CommitMessageConfig
    provider: any
    endpoint_url: string
  }
  view_provider?: ViewProvider
}): Promise<string | null> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const commit_message_prompt = config.get<string>('commitMessageInstructions')
  const all_ignored_extensions = get_ignored_extensions()

  // Use provided config or get it if not provided (for backward compatibility)
  const resolved_api_config =
    params.api_config || (await get_commit_message_config(params.context))
  if (!resolved_api_config) return null

  const affected_files_data = await collect_affected_files_with_metadata({
    repository: params.repository,
    ignored_extensions: all_ignored_extensions
  })

  const selected_files = await handle_file_selection_if_needed({
    context: params.context,
    files_data: affected_files_data
  })
  if (!selected_files) return null

  const affected_files = build_files_content(selected_files)
  const message = build_commit_message_prompt(
    commit_message_prompt!,
    affected_files,
    params.diff
  )

  return await generate_commit_message_with_api({
    endpoint_url: resolved_api_config.endpoint_url,
    provider: resolved_api_config.provider,
    config: resolved_api_config.config,
    message,
    view_provider: params.view_provider
  })
}
