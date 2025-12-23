import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { make_api_request } from '@/utils/make-api-request'
import axios, { CancelTokenSource } from 'axios'
import { randomUUID } from 'crypto'
import { Logger } from '@shared/utils/logger'

export class ApiManager {
  private cancel_token_sources: Map<string, CancelTokenSource> = new Map()
  private next_allowed_finish_time = 0
  // Waiting pipeline to utilize KV cache for the same endpoint urls
  private waiting_chain: Map<string, Promise<void>> = new Map()

  constructor(private panel_provider: PanelProvider) {}

  public async get(params: {
    endpoint_url: string
    api_key?: string
    body: any
    request_id?: string
  }): Promise<{ response: string; thoughts?: string } | null> {
    const request_id = params.request_id || randomUUID()
    const cancel_token_source = axios.CancelToken.source()
    this.cancel_token_sources.set(request_id, cancel_token_source)

    const previous_waiting_promise = this.waiting_chain.get(params.endpoint_url)
    let resolve_waiting: () => void = () => {}
    const waiting_promise = new Promise<void>((resolve) => {
      resolve_waiting = resolve
    })
    this.waiting_chain.set(params.endpoint_url, waiting_promise)

    try {
      this.panel_provider.send_message({
        command: 'SHOW_API_MANAGER_PROGRESS',
        id: request_id,
        title: 'Waiting...'
      })

      if (previous_waiting_promise) {
        await previous_waiting_promise
      }

      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.api_key,
        body: params.body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          resolve_waiting()
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            title: 'Thinking...'
          })
        },
        on_chunk: (tokens_per_second, total_tokens) => {
          resolve_waiting()
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
          function_name: 'get',
          message: 'API call cancelled by user'
        })
        throw error
      }

      Logger.error({
        function_name: 'get',
        message: 'API call error',
        data: error
      })
      return null
    } finally {
      resolve_waiting()
      this.panel_provider.send_message({
        command: 'HIDE_API_MANAGER_PROGRESS',
        id: request_id
      })
      this.cancel_token_sources.delete(request_id)

      // Prevent race conditions of the applyChatResponse command when invoked in short successions
      const now = Date.now()
      const wait_until = Math.max(now, this.next_allowed_finish_time)
      const delay = wait_until - now
      this.next_allowed_finish_time = wait_until + 500

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
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
