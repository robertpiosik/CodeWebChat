import { PromptViewProvider } from '../prompt-view-provider'
import { SetRecordingStateMessage } from '../../types/messages'
import { spawn } from 'child_process'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  ApiConfiguration
} from '@/services/model-providers-manager'
import * as vscode from 'vscode'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import axios from 'axios'
import { send_llm_message } from '@/utils/send-llm-message'
import { voice_input_instructions } from '@/constants/instructions'
import { LAST_USED_VOICE_INPUT_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { t } from '@/i18n'

const MIN_RECORDING_DURATION = 1000

const start_recording = (prompt_view_provider: PromptViewProvider) => {
  prompt_view_provider.audio_chunks = []
  prompt_view_provider.recording_start_time = Date.now()
  try {
    prompt_view_provider.recording_process = spawn('rec', [
      '-q',
      '-t',
      'wav',
      '-'
    ])

    prompt_view_provider.recording_process.stdout.on(
      'data',
      (chunk: Buffer) => {
        prompt_view_provider.audio_chunks.push(chunk)
      }
    )

    prompt_view_provider.recording_process.on('error', (error: any) => {
      if (error.code == 'ENOENT') {
        let error_message = t(
          'views.prompt.handlers.voice-input.error.sox-missing'
        )

        if (process.platform == 'darwin') {
          error_message = t(
            'views.prompt.handlers.voice-input.error.sox-missing.mac'
          )
        } else if (process.platform == 'linux') {
          error_message = t(
            'views.prompt.handlers.voice-input.error.sox-missing.linux'
          )
        } else if (process.platform == 'win32') {
          error_message = t(
            'views.prompt.handlers.voice-input.error.sox-missing.windows'
          )
        }

        const learn_more = t(
          'views.prompt.handlers.voice-input.button.learn-more'
        )

        vscode.window
          .showErrorMessage(error_message, learn_more)
          .then((selection) => {
            if (selection === learn_more) {
              vscode.env.openExternal(
                vscode.Uri.parse('https://sourceforge.net/projects/sox/')
              )
            }
          })
      } else {
        vscode.window.showErrorMessage(
          t('views.prompt.handlers.voice-input.error.start-failed', {
            error: error.message
          })
        )
      }

      Logger.error({
        function_name: 'start_recording',
        message: 'Failed to start recording process',
        data: { error }
      })

      // Ensure the UI state resets if recording failed to start
      prompt_view_provider.is_recording = false
      prompt_view_provider.send_message({
        command: 'RECORDING_STATE',
        is_recording: false
      })
      prompt_view_provider.recording_process = null
    })
  } catch (error: any) {
    Logger.error({
      function_name: 'start_recording',
      message: 'Failed to start recording',
      data: { error }
    })
  }
}

const stop_recording = async (prompt_view_provider: PromptViewProvider) => {
  if (prompt_view_provider.recording_process) {
    prompt_view_provider.recording_process.kill()
    prompt_view_provider.recording_process = null

    if (
      Date.now() - prompt_view_provider.recording_start_time <
      MIN_RECORDING_DURATION
    ) {
      prompt_view_provider.audio_chunks = []
      return
    }

    const audio_buffer = Buffer.concat(prompt_view_provider.audio_chunks)
    const base64_audio = audio_buffer.toString('base64')

    prompt_view_provider.audio_chunks = []

    try {
      const model_providers_manager = new ModelProvidersManager(
        prompt_view_provider.extension_context
      )
      const api_configurations =
        await model_providers_manager.get_api_configurations()

      if (api_configurations.length == 0) return

      let api_configuration: ApiConfiguration | undefined =
        await model_providers_manager.get_default_voice_input_api_configuration()

      if (!api_configuration) {
        if (api_configurations.length == 1) {
          api_configuration = api_configurations[0]
        } else {
          const recent_id =
            prompt_view_provider.extension_context.workspaceState.get<string>(
              LAST_USED_VOICE_INPUT_CONFIG_ID_STATE_KEY
            )

          const result = await show_configuration_quick_pick({
            items: api_configurations,
            map_item: map_api_configuration_to_item,
            last_selected_id: recent_id
          })

          if (!result || result === 'back') {
            return
          }

          api_configuration = result.item

          prompt_view_provider.extension_context.workspaceState.update(
            LAST_USED_VOICE_INPUT_CONFIG_ID_STATE_KEY,
            result.id
          )
        }
      }

      prompt_view_provider.send_message({
        command: 'SHOW_PROGRESS',
        title: t('views.prompt.handlers.voice-input.progress.transcribing'),
        show_elapsed_time: true,
        cancellable: true
      })

      const model_provider = await model_providers_manager.get_model_provider(
        api_configuration!.model_provider_name
      )

      if (!model_provider) {
        vscode.window.showErrorMessage(
          t('views.prompt.handlers.voice-input.error.provider-not-found', {
            name: api_configuration!.model_provider_name
          })
        )
        return
      }

      const body: { [key: string]: any } = {
        model: api_configuration.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: voice_input_instructions
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: base64_audio,
                  format: 'wav'
                }
              }
            ]
          }
        ]
      }

      apply_reasoning_effort({
        body,
        model_provider,
        reasoning_effort: api_configuration.reasoning_effort
      })

      prompt_view_provider.api_call_abort_controller = new AbortController()

      const result = await send_llm_message({
        base_url: model_provider.base_url,
        api_key: model_provider.api_key,
        body,
        abort_signal: prompt_view_provider.api_call_abort_controller.signal
      })

      if (result?.response) {
        if (result.response.trim().toUpperCase() == 'INAUDIBLE') {
          prompt_view_provider.send_message({
            command: 'SHOW_AUTO_CLOSING_MODAL',
            title: t('views.prompt.handlers.voice-input.warning.inaudible'),
            type: 'warning'
          })
        } else {
          prompt_view_provider.add_text_at_cursor_position(result.response)
        }
      }
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return
      }

      Logger.error({
        function_name: 'stop_recording',
        message: 'Failed to process audio',
        data: { error }
      })
      vscode.window.showErrorMessage(
        t('views.prompt.handlers.voice-input.error.process-failed', {
          error: error.message
        })
      )
    } finally {
      prompt_view_provider.api_call_abort_controller = null
      prompt_view_provider.send_message({
        command: 'HIDE_PROGRESS'
      })
    }
  }
}

export const handle_voice_input = async (
  prompt_view_provider: PromptViewProvider,
  message: SetRecordingStateMessage
) => {
  if (prompt_view_provider.is_recording == message.is_recording) {
    return
  }

  if (message.is_recording) {
    const model_providers_manager = new ModelProvidersManager(
      prompt_view_provider.extension_context
    )
    const api_configurations =
      await model_providers_manager.get_api_configurations()

    if (api_configurations.length == 0) {
      vscode.window.showWarningMessage(
        t('views.prompt.handlers.voice-input.warning.no-config.title'),
        {
          modal: true,
          detail: t(
            'views.prompt.handlers.voice-input.warning.no-config.detail'
          )
        }
      )
      prompt_view_provider.send_message({
        command: 'RECORDING_STATE',
        is_recording: false
      })
      return
    }
  }

  prompt_view_provider.is_recording = message.is_recording
  prompt_view_provider.send_message({
    command: 'RECORDING_STATE',
    is_recording: prompt_view_provider.is_recording
  })

  if (prompt_view_provider.is_recording) {
    start_recording(prompt_view_provider)
  } else {
    await stop_recording(prompt_view_provider)
  }
}
