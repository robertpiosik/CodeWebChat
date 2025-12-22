import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { make_api_request } from '@/utils/make-api-request'
import axios, { CancelTokenSource } from 'axios'
import { randomUUID } from 'crypto'
import { Logger } from '@shared/utils/logger'

export class ApiManager {
  private cancel_token_sources: Map<string, CancelTokenSource> = new Map()

  constructor(private panel_provider: PanelProvider) {}

  public async get(params: {
    endpoint_url: string
    api_key?: string
    body: any
  }): Promise<{ response: string; thoughts?: string } | null> {
    const request_id = randomUUID()
    const cancel_token_source = axios.CancelToken.source()
    this.cancel_token_sources.set(request_id, cancel_token_source)

    try {
      this.panel_provider.send_message({
        command: 'SHOW_API_MANAGER_PROGRESS',
        id: request_id,
        title: 'Waiting...'
      })

      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.api_key,
        body: params.body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            title: 'Thinking...'
          })
        },
        on_chunk: (tokens_per_second, total_tokens) => {
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            title: 'Receiving...',
            tokens_per_second,
            total_tokens
          })
        }
      })
      return result
    } catch (error) {
      if (axios.isCancel(error)) {
        Logger.info({
          function_name: 'make_api_call',
          message: 'API call cancelled by user'
        })
        throw error // Re-throw cancellation error to be handled by caller
      }

      Logger.error({
        function_name: 'make_api_call',
        message: 'API call error',
        data: error
      })
      // Error messages are shown by make_api_request, so no need to show one here.
      return null
    } finally {
      this.panel_provider.send_message({
        command: 'HIDE_API_MANAGER_PROGRESS',
        id: request_id
      })
      this.cancel_token_sources.delete(request_id)
    }
  }

  public cancel_api_call(request_id: string) {
    const source = this.cancel_token_sources.get(request_id)
    if (source) {
      source.cancel('Cancelled by user.')
      this.cancel_token_sources.delete(request_id)
    }
  }
}
