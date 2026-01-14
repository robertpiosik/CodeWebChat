import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { make_api_request } from '@/utils/make-api-request'
import axios, { CancelTokenSource } from 'axios'
import { randomUUID, createHash } from 'crypto'
import { Logger } from '@shared/utils/logger'

const CHAIN_RESOLUTION_DELAY_MS = 2000

export class ApiManager {
  private cancel_token_sources: Map<string, CancelTokenSource> = new Map()
  private next_allowed_finish_time = 0
  // Waiting pipeline to utilize KV cache for the same endpoint urls
  private waiting_chain: Map<
    string,
    { promise: Promise<void>; resolve: () => void; body_hash: string }
  > = new Map()

  constructor(private panel_provider: PanelProvider) {}

  public async get(params: {
    endpoint_url: string
    api_key?: string
    body: any
    request_id?: string
    provider_name: string
    model?: string
    reasoning_effort?: string
  }): Promise<{ response: string; thoughts?: string } | null> {
    const request_id = params.request_id || randomUUID()
    const cancel_token_source = axios.CancelToken.source()
    this.cancel_token_sources.set(request_id, cancel_token_source)

    const body_hash = createHash('md5')
      .update(JSON.stringify(params.body))
      .digest('hex')
    const previous_waiting = this.waiting_chain.get(params.endpoint_url)

    let resolve_current: () => void = () => {}
    const current_promise = new Promise<void>((resolve) => {
      resolve_current = resolve
    })

    let is_chain_resolution_scheduled = false
    const schedule_chain_resolution = () => {
      if (is_chain_resolution_scheduled) return
      const chain_entry = this.waiting_chain.get(params.endpoint_url)
      if (chain_entry && chain_entry.resolve === resolve_current) {
        is_chain_resolution_scheduled = true
        setTimeout(() => {
          chain_entry.resolve()
          const current_entry = this.waiting_chain.get(params.endpoint_url)
          if (current_entry && current_entry.resolve === resolve_current) {
            this.waiting_chain.delete(params.endpoint_url)
          }
        }, CHAIN_RESOLUTION_DELAY_MS)
      }
    }

    if (!previous_waiting || previous_waiting.body_hash !== body_hash) {
      this.waiting_chain.set(params.endpoint_url, {
        promise: current_promise,
        resolve: resolve_current,
        body_hash
      })
    }

    try {
      this.panel_provider.send_message({
        command: 'SHOW_API_MANAGER_PROGRESS',
        id: request_id,
        title: 'Waiting...',
        provider_name: params.provider_name,
        model: params.model,
        reasoning_effort: params.reasoning_effort
      })

      if (previous_waiting && previous_waiting.body_hash === body_hash) {
        await previous_waiting.promise
      }

      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.api_key,
        body: params.body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          schedule_chain_resolution()
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            title: 'Thinking...',
            provider_name: params.provider_name,
            model: params.model,
            reasoning_effort: params.reasoning_effort
          })
        },
        on_chunk: (tokens_per_second, total_tokens) => {
          schedule_chain_resolution()
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            title: 'Receiving...',
            tokens_per_second,
            total_tokens,
            provider_name: params.provider_name,
            model: params.model,
            reasoning_effort: params.reasoning_effort
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
      // Unblock anyone waiting for this request if it was the one in the chain
      if (!is_chain_resolution_scheduled) {
        const chain_entry = this.waiting_chain.get(params.endpoint_url)
        if (chain_entry && chain_entry.resolve === resolve_current) {
          chain_entry.resolve()
          this.waiting_chain.delete(params.endpoint_url)
        }
      }

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
