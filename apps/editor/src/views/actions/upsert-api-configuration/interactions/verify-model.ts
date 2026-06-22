import * as vscode from 'vscode'
import axios from 'axios'

export const verify_model = async (params: {
  model: string
  base_url: string
  api_key?: string
  is_voice_input?: boolean
}): Promise<boolean> => {
  let error: any | undefined
  let success = false

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Sending test message...',
      cancellable: true
    },
    async (_progress, token) => {
      try {
        const messages: any[] = params.is_voice_input
          ? [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Transcribe this audio.' },
                  {
                    type: 'input_audio',
                    input_audio: { data: '', format: 'wav' }
                  }
                ]
              }
            ]
          : [
              {
                role: 'user',
                content: 'Test'
              }
            ]

        await axios.post(
          `${params.base_url}/chat/completions`,
          {
            model: params.model,
            messages,
            max_tokens: 1
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(params.api_key
                ? { Authorization: `Bearer ${params.api_key}` }
                : {})
            },
            cancelToken: new axios.CancelToken((c) => {
              token.onCancellationRequested(() => {
                c('User cancelled')
              })
            })
          }
        )
        success = true
      } catch (e: any) {
        if (!token.isCancellationRequested) {
          error = e
        }
      }
    }
  )

  if (success) {
    return true
  }

  if (!error) {
    return false
  }

  const title = 'Test message failed'
  let detail = 'Error'

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      let reason = 'Server Error'
      switch (status) {
        case 400:
          reason = 'Bad Request'
          break
        case 401:
          reason = 'Authentication Error'
          break
        case 403:
          reason = 'Access Forbidden'
          break
        case 404:
          reason = 'Model not found'
          break
        case 429:
          reason = 'Rate limit exceeded'
          break
        case 500:
          reason = 'Internal Server Error'
          break
        case 502:
          reason = 'Bad Gateway'
          break
        case 503:
          reason = 'Service Unavailable'
          break
      }
      detail = `Status code: ${status} (${reason})`
    } else if (error.code) {
      detail = error.message
    }
  }

  const choice = await vscode.window.showWarningMessage(
    title,
    { modal: true, detail },
    'Use Anyway'
  )
  return choice == 'Use Anyway'
}
