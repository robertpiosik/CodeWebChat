import * as vscode from 'vscode'
import axios from 'axios'
import { ModelProvider } from '@/services/model-providers-manager'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'

export const verify_reasoning_effort = async (params: {
  endpoint_url: string
  api_key?: string
  model: string
  reasoning_effort: string
  model_provider: ModelProvider
  cancellation_token: vscode.CancellationToken
}): Promise<void> => {
  const cancel_source = axios.CancelToken.source()

  const disposable = params.cancellation_token.onCancellationRequested(() => {
    cancel_source.cancel('User cancelled')
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
      params.endpoint_url + '/chat/completions',
      body,
      {
        headers: {
          ...(params.api_key
            ? { ['Authorization']: `Bearer ${params.api_key}` }
            : {}),
          ['Content-Type']: 'application/json'
        },
        responseType: 'stream',
        cancelToken: cancel_source.token
      }
    )

    await new Promise<void>((resolve, reject) => {
      const stream = response.data

      stream.on('data', () => {
        cancel_source.cancel('Verified')
        resolve()
      })

      stream.on('error', (err: any) => {
        reject(err)
      })

      stream.on('end', () => {
        resolve()
      })
    })
  } catch (error) {
    if (axios.isCancel(error)) {
      if (error.message == 'Verified') {
        return
      }
      if (error.message == 'User cancelled') {
        throw new Error('Cancelled')
      }
    }
    throw error
  } finally {
    disposable.dispose()
  }
}
