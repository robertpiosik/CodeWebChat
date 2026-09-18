import * as vscode from 'vscode'
import axios from 'axios'
import { t } from '@/i18n'

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
            headers: {
              'Content-Type': 'application/json',
              ...(params.api_key
                ? { Authorization: `Bearer ${params.api_key}` }
                : {})
            },
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
      let reason = t('common.network.error.server-error')
      switch (status) {
        case 400:
          reason = t('common.network.error.bad-request')
          break
        case 401:
          reason = t('common.network.error.authentication')
          break
        case 403:
          reason = t('common.network.error.forbidden')
          break
        case 404:
          reason = t('common.network.error.not-found')
          break
        case 429:
          reason = t('common.network.error.rate-limit')
          break
        case 500:
          reason = t('common.network.error.internal')
          break
        case 502:
          reason = t('common.network.error.bad-gateway')
          break
        case 503:
          reason = t('common.network.error.service-unavailable')
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
