import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ApiManagerProvider } from '@/views/api-manager/backend/api-manager-provider'
import { make_api_request } from '@/utils/make-api-request'
import axios, { CancelTokenSource } from 'axios'
import { randomUUID, createHash } from 'crypto'
import { Logger } from '@shared/utils/logger'

const CHAIN_RESOLUTION_DELAY_MS = 5000

export class ApiManager {
  private cancel_token_sources: Map<string, CancelTokenSource> = new Map()
  private next_allowed_finish_time = 0
  private waiting_chain: Map<
    string,
    { promise: Promise<void>; resolve: () => void; body_hash: string }
  > = new Map()

  constructor(
    private panel_provider: PanelProvider,
    private api_manager_provider: ApiManagerProvider
  ) {}

  private broadcast_message(message: any) {
    this.panel_provider.send_message(message)
    this.api_manager_provider.send_message(message)
  }

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

    const body_to_hash = JSON.parse(JSON.stringify(params.body))
    delete body_to_hash.reasoning_effort
    delete body_to_hash.reasoning
    if (body_to_hash.extra_body?.google?.thinking_config) {
      delete body_to_hash.extra_body.google.thinking_config
    }

    const body_hash = createHash('md5')
      .update(JSON.stringify(body_to_hash))
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
        }, CHAIN_RESOLUTION_DELAY_MS)
      }
    }

    if (!previous_waiting || previous_waiting.body_hash != body_hash) {
      this.waiting_chain.set(params.endpoint_url, {
        promise: current_promise,
        resolve: resolve_current,
        body_hash
      })
    }

    try {
      const is_queued =
        previous_waiting && previous_waiting.body_hash == body_hash

      this.broadcast_message({
        command: 'SHOW_API_MANAGER_PROGRESS',
        id: request_id,
        status: is_queued ? 'Queued...' : 'Waiting for server...',
        provider_name: params.provider_name,
        model: params.model,
        reasoning_effort: params.reasoning_effort
      })

      if (is_queued) {
        if (cancel_token_source.token.reason) {
          throw cancel_token_source.token.reason
        }
        await Promise.race([
          previous_waiting.promise,
          cancel_token_source.token.promise.then((c) => Promise.reject(c))
        ])

        this.broadcast_message({
          command: 'SHOW_API_MANAGER_PROGRESS',
          id: request_id,
          status: 'Waiting for server...',
          provider_name: params.provider_name,
          model: params.model,
          reasoning_effort: params.reasoning_effort
        })
      }

      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.api_key,
        body: params.body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          schedule_chain_resolution()
          this.broadcast_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            status: 'Thinking...',
            provider_name: params.provider_name,
            model: params.model,
            reasoning_effort: params.reasoning_effort
          })
        },
        on_chunk: (tokens_per_second, total_tokens) => {
          schedule_chain_resolution()
          this.broadcast_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            id: request_id,
            status: 'Receiving...',
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
        throw error
      } else {
        Logger.error({
          function_name: 'get',
          message: 'API call error',
          data: error
        })
      }

      return null
    } finally {
      if (!is_chain_resolution_scheduled) {
        resolve_current()
      }

      this.broadcast_message({
        command: 'HIDE_API_MANAGER_PROGRESS',
        id: request_id
      })
      this.cancel_token_sources.delete(request_id)

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

  public cancel_all_requests() {
    this.cancel_token_sources.forEach((source) => {
      source.cancel('Cancelled by user.')
    })
    this.cancel_token_sources.clear()
  }
}
