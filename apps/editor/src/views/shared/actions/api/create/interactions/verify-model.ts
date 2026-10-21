import * as vscode from 'vscode'
import axios from 'axios'
import { t } from '@/i18n'
import { build_request_headers } from '@/utils/build-request-headers'

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
      title: params.is_voice_input
        ? t(
            'views.shared.actions.api.create.interactions.verify-model.progress.audio'
          )
        : t(
            'views.shared.actions.api.create.interactions.verify-model.progress.test'
          ),
      cancellable: true
    },
    async (_progress, token) => {
      try {
        const messages: any[] = params.is_voice_input
          ? [
              {
                role: 'user',
                content: 'Respond with "OK", and nothing else.'
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'input_audio',
                    input_audio: {
                      data:
                        'UklGRiR9AABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQB9' +
                        // 1 second of silence (16kHz, 16-bit, mono WAV)
                        'AAAA'.repeat(10667) +
                        'AA==',
                      format: 'wav'
                    }
                  }
                ]
              }
            ]
          : [
              {
                role: 'user',
                content: 'Respond with "OK", and nothing else.'
              }
            ]

        const abort_controller = new AbortController()
        const disposable = token.onCancellationRequested(() => {
          abort_controller.abort('User cancelled')
        })

        await axios.post(
          `${params.base_url}/chat/completions`,
          {
            model: params.model,
            messages,
            stream: true
          },
          {
            headers: build_request_headers({
              base_url: params.base_url,
              api_key: params.api_key
            }),
            signal: abort_controller.signal,
            responseType: 'stream'
          }
        )

        abort_controller.abort('Verified')
        disposable.dispose()
        success = true
      } catch (e: any) {
        if (!axios.isCancel(e)) {
          if (e.response) {
            e.status = e.response.status
          }
          console.log(e.message)
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

  const title = params.is_voice_input
    ? t(
        'views.shared.actions.api.create.interactions.verify-model.warning.audio.title'
      )
    : t(
        'views.shared.actions.api.create.interactions.verify-model.warning.test.title'
      )
  let detail = params.is_voice_input
    ? t(
        'views.shared.actions.api.create.interactions.verify-model.warning.audio.detail'
      )
    : t(
        'views.shared.actions.api.create.interactions.verify-model.warning.test.detail'
      )

  if (error) {
    if (error.status) {
      const status = error.status
      let reason = t(
        'views.shared.actions.api.create.interactions.verify-model.error.server-error'
      )
      switch (status) {
        case 400:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.bad-request' as any
          )
          break
        case 401:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.authentication' as any
          )
          break
        case 403:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.forbidden' as any
          )
          break
        case 404:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.not-found' as any
          )
          break
        case 429:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.rate-limit' as any
          )
          break
        case 500:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.internal' as any
          )
          break
        case 502:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.bad-gateway' as any
          )
          break
        case 503:
          reason = t(
            'views.shared.actions.api.create.interactions.verify-model.error.service-unavailable' as any
          )
          break
      }
      detail = params.is_voice_input
        ? t(
            'views.shared.actions.api.create.interactions.verify-model.warning.audio.detail'
          )
        : t(
            'views.shared.actions.api.create.interactions.verify-model.error.status-code',
            {
              status: status.toString(),
              reason
            }
          )
    } else if (error.message) {
      detail = params.is_voice_input
        ? t(
            'views.shared.actions.api.create.interactions.verify-model.warning.audio.detail'
          )
        : error.message
    }
  }

  if (params.is_voice_input) {
    await vscode.window.showWarningMessage(title, { modal: true, detail })
    return false
  }

  const use_anyway = t(
    'views.shared.actions.api.create.interactions.verify-model.action.use-anyway'
  )
  const choice = await vscode.window.showWarningMessage(
    title,
    { modal: true, detail },
    use_anyway
  )
  return choice == use_anyway
}
