import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { make_api_request } from '@/utils/make-api-request'
import axios, { CancelTokenSource } from 'axios'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

export class ApiManager {
  public api_call_cancel_token_source: CancelTokenSource | null = null

  constructor(private panel_provider: PanelProvider) {}

  public async get(params: {
    endpoint_url: string
    api_key?: string
    body: any
  }): Promise<{ response: string; thoughts?: string } | null> {
    const cancel_token_source = axios.CancelToken.source()
    this.api_call_cancel_token_source = cancel_token_source

    try {
      this.panel_provider.send_message({
        command: 'SHOW_API_MANAGER_PROGRESS',
        title: `${dictionary.api_call.WAITING_FOR_RESPONSE}...`
      })

      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.api_key,
        body: params.body,
        cancellation_token: cancel_token_source.token,
        on_thinking_chunk: () => {
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            title: `${dictionary.api_call.THINKING}...`
          })
        },
        on_chunk: (tokens_per_second) => {
          this.panel_provider.send_message({
            command: 'SHOW_API_MANAGER_PROGRESS',
            title: 'Receiving response...',
            tokens_per_second
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
      this.panel_provider.send_message({ command: 'HIDE_API_MANAGER_PROGRESS' })
      this.api_call_cancel_token_source = null
    }
  }

  public cancel_api_call() {
    if (this.api_call_cancel_token_source) {
      this.api_call_cancel_token_source.cancel('Cancelled by user.')
      this.api_call_cancel_token_source = null
    }
  }
}
