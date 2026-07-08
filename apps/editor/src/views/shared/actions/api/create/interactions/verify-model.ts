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
        ? t('views.common.actions.verify-model.progress.audio')
        : t('views.common.actions.verify-model.progress.test'),
      cancellable: true
    },
    async (_progress, token) => {
      try {
        const messages: any[] = params.is_voice_input
          ? [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: t(
                      'views.common.actions.verify-model.prompt.transcribe'
                    )
                  },
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
                content: t('views.common.actions.verify-model.prompt.test')
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

  const title = params.is_voice_input
    ? t('views.common.actions.verify-model.warning.audio.title')
    : t('views.common.actions.verify-model.warning.test.title')
  let detail = params.is_voice_input
    ? t('views.common.actions.verify-model.warning.audio.detail')
    : t('views.common.actions.verify-model.warning.test.detail')

  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status
      let reason = t('views.common.actions.verify-model.status.server-error')
      switch (status) {
        case 400:
          reason = t('views.common.actions.verify-model.status.bad-request')
          break
        case 401:
          reason = t('views.common.actions.verify-model.status.authentication')
          break
        case 403:
          reason = t('views.common.actions.verify-model.status.forbidden')
          break
        case 404:
          reason = t('views.common.actions.verify-model.status.not-found')
          break
        case 429:
          reason = t('views.common.actions.verify-model.status.rate-limit')
          break
        case 500:
          reason = t('views.common.actions.verify-model.status.internal')
          break
        case 502:
          reason = t('views.common.actions.verify-model.status.bad-gateway')
          break
        case 503:
          reason = t(
            'views.common.actions.verify-model.status.service-unavailable'
          )
          break
      }
      detail = params.is_voice_input
        ? t('views.common.actions.verify-model.error.audio-status-code', {
            status: status.toString(),
            reason
          })
        : t('views.common.actions.verify-model.error.status-code', {
            status: status.toString(),
            reason
          })
    } else if (error.code) {
      detail = params.is_voice_input
        ? t('views.common.actions.verify-model.error.audio-error', {
            error: error.message
          })
        : error.message
    }
  }

  const use_anyway = t('views.common.actions.verify-model.action.use-anyway')
  const choice = await vscode.window.showWarningMessage(
    title,
    { modal: true, detail },
    use_anyway
  )
  return choice == use_anyway
}
