import * as vscode from 'vscode'
import { ModelProvider } from '@/services/model-providers-manager'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import axios from 'axios'

export const verify_reasoning_effort = async (params: {
  base_url: string
  api_key?: string
  model: string
  reasoning_effort: string
  model_provider: ModelProvider
  cancellation_token: vscode.CancellationToken
}): Promise<void> => {
  const abort_controller = new AbortController()

  const disposable = params.cancellation_token.onCancellationRequested(() => {
    abort_controller.abort('User cancelled')
  })

  const body = {
    model: params.model,
    messages: [
      {
        role: 'user',
        content: 'Respond with "Hello!" and nothing else.'
      }
    ],
    stream: true
  }

  apply_reasoning_effort({
    body,
    model_provider: params.model_provider,
    reasoning_effort: params.reasoning_effort as any
  })

  try {
    const response = await axios.post(
      params.base_url + '/chat/completions',
      body,
      {
        headers: {
          ...(params.api_key
            ? { ['Authorization']: `Bearer ${params.api_key}` }
            : {}),
          ['Content-Type']: 'application/json'
        },
        signal: abort_controller.signal,
        responseType: 'stream'
      }
    )

    await new Promise<void>((resolve, reject) => {
      let resolved = false
      response.data.on('data', () => {
        if (!resolved) {
          resolved = true
          abort_controller.abort('Verified')
          resolve()
        }
      })
      response.data.on('end', () => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      })
      response.data.on('error', (err: any) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })
    })
  } catch (error: any) {
    if (axios.isCancel(error)) {
      if (
        error.message === 'User cancelled' ||
        params.cancellation_token.isCancellationRequested
      ) {
        throw new Error('Cancelled')
      }
      return
    }

    throw error
  } finally {
    disposable.dispose()
  }
}
