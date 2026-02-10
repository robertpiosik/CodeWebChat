import { PanelProvider } from '../panel-provider'
import { SetRecordingStateMessage } from '../../types/messages'
import { spawn } from 'child_process'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'
import * as vscode from 'vscode'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import axios from 'axios'
import { make_api_request } from '@/utils/make-api-request'
import { voice_input_instructions } from '@/constants/instructions'

const MIN_RECORDING_DURATION = 1000

const start_recording = (panel_provider: PanelProvider) => {
  panel_provider.audio_chunks = []
  panel_provider.recording_start_time = Date.now()
  try {
    panel_provider.recording_process = spawn('rec', ['-q', '-t', 'wav', '-'])
    panel_provider.recording_process.stdout.on('data', (chunk: Buffer) => {
      panel_provider.audio_chunks.push(chunk)
    })
  } catch (error: any) {
    Logger.error({
      function_name: 'start_recording',
      message: 'Failed to start recording',
      data: { error }
    })
  }
}

const stop_recording = async (panel_provider: PanelProvider) => {
  if (panel_provider.recording_process) {
    panel_provider.recording_process.kill()
    panel_provider.recording_process = null

    if (
      Date.now() - panel_provider.recording_start_time <
      MIN_RECORDING_DURATION
    ) {
      panel_provider.audio_chunks = []
      return
    }

    const audio_buffer = Buffer.concat(panel_provider.audio_chunks)
    const base64_audio = audio_buffer.toString('base64')

    panel_provider.audio_chunks = []

    try {
      const model_providers_manager = new ModelProvidersManager(
        panel_provider.context
      )
      const configs =
        await model_providers_manager.get_voice_input_tool_configs()

      if (configs.length == 0) return

      let config: ToolConfig | undefined =
        await model_providers_manager.get_default_voice_input_config()

      if (!config) {
        if (configs.length == 1) {
          config = configs[0]
        } else {
          const selected = await vscode.window.showQuickPick(
            configs.map((c) => ({
              label: c.model,
              description: c.provider_name,
              config: c
            })),
            {
              title: 'Configurations',
              placeHolder: 'Select a configuration'
            }
          )
          if (selected) {
            config = selected.config
          } else {
            return
          }
        }
      }

      panel_provider.send_message({
        command: 'SHOW_PROGRESS',
        title: 'Transcribing...',
        cancellable: true
      })

      const provider = await model_providers_manager.get_provider(
        config!.provider_name
      )

      if (!provider) {
        vscode.window.showErrorMessage(
          `Provider ${config.provider_name} not found.`
        )
        return
      }

      let endpoint_url = ''
      if (provider.type == 'built-in') {
        const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
        if (provider_info) {
          endpoint_url = provider_info.base_url
        }
      } else {
        endpoint_url = provider.base_url
      }

      const instructions = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<string>('voiceInputInstructions')

      const body: { [key: string]: any } = {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: instructions || voice_input_instructions
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

      apply_reasoning_effort(body, provider, config.reasoning_effort)

      panel_provider.api_call_cancel_token_source = axios.CancelToken.source()

      const result = await make_api_request({
        endpoint_url,
        api_key: provider.api_key,
        body,
        cancellation_token: panel_provider.api_call_cancel_token_source.token
      })

      if (result?.response) {
        panel_provider.add_text_at_cursor_position(result.response)
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
        'Failed to process audio: ' + error.message
      )
    } finally {
      panel_provider.api_call_cancel_token_source = null
      panel_provider.send_message({
        command: 'HIDE_PROGRESS'
      })
    }
  }
}

export const handle_voice_input = async (
  panel_provider: PanelProvider,
  message: SetRecordingStateMessage
) => {
  if (panel_provider.is_recording === message.is_recording) {
    return
  }

  if (message.is_recording) {
    const model_providers_manager = new ModelProvidersManager(
      panel_provider.context
    )
    const configs = await model_providers_manager.get_voice_input_tool_configs()

    if (configs.length == 0) {
      vscode.window.showWarningMessage('No configuration found', {
        modal: true,
        detail:
          'Add a "Voice Input" configuration in settings to use this feature.'
      })
      panel_provider.send_message({
        command: 'RECORDING_STATE',
        is_recording: false
      })
      return
    }
  }

  panel_provider.is_recording = message.is_recording
  panel_provider.send_message({
    command: 'RECORDING_STATE',
    is_recording: panel_provider.is_recording
  })

  if (panel_provider.is_recording) {
    start_recording(panel_provider)
  } else {
    await stop_recording(panel_provider)
  }
}
