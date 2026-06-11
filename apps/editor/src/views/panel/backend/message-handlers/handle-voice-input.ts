import { PanelProvider } from '../panel-provider'
import { SetRecordingStateMessage } from '../../types/messages'
import { spawn } from 'child_process'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  ApiConfiguration,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import * as vscode from 'vscode'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import axios from 'axios'
import { make_api_request } from '@/utils/make-api-request'
import { voice_input_instructions } from '@/constants/instructions'
import { RECENTLY_USED_VOICE_INPUT_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'

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
      const api_configurations = await model_providers_manager.get_api_configurations()

      if (api_configurations.length == 0) return

      let api_configuration: ApiConfiguration | undefined =
        await model_providers_manager.get_default_voice_input_api_configuration()

      if (!api_configuration) {
        if (api_configurations.length == 1) {
          api_configuration = api_configurations[0]
        } else {
          const recent_ids =
            panel_provider.context.workspaceState.get<string[]>(
              RECENTLY_USED_VOICE_INPUT_CONFIG_IDS_STATE_KEY
            ) || []

          const matched_recent_api_configurations: ApiConfiguration[] = []
          const remaining_api_configurations: ApiConfiguration[] = []

          api_configurations.forEach((api_configuration) => {
            const id = get_api_configuration_id(api_configuration)
            if (recent_ids.includes(id)) {
              matched_recent_api_configurations.push(api_configuration)
            } else {
              remaining_api_configurations.push(api_configuration)
            }
          })

          matched_recent_api_configurations.sort((a, b) => {
            const id_a = get_api_configuration_id(a)
            const id_b = get_api_configuration_id(b)
            return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
          })

          const map_api_configuration_to_item = (api_configuration: ApiConfiguration) => ({
            label: api_configuration.model,
            description: api_configuration.model_provider_name,
            api_configuration,
            id: get_api_configuration_id(api_configuration)
          })

          const items: (vscode.QuickPickItem & {
            api_configuration?: ApiConfiguration
            id?: string
          })[] = []

          if (matched_recent_api_configurations.length > 0) {
            items.push({
              label: 'recently used',
              kind: vscode.QuickPickItemKind.Separator
            })
            items.push(...matched_recent_api_configurations.map(map_api_configuration_to_item))
          }

          if (remaining_api_configurations.length > 0) {
            if (matched_recent_api_configurations.length > 0) {
              items.push({
                label: 'other configurations',
                kind: vscode.QuickPickItemKind.Separator
              })
            }
            items.push(...remaining_api_configurations.map(map_api_configuration_to_item))
          }

          const quick_pick = vscode.window.createQuickPick()
          quick_pick.items = items
          quick_pick.title = 'Configurations'
          quick_pick.placeholder = 'Select a configuration'
          quick_pick.buttons = [
            {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: 'Close'
            }
          ]

          const selected = await new Promise<
            | (vscode.QuickPickItem & {
                api_configuration?: ApiConfiguration
                id?: string
              })
            | undefined
          >((resolve) => {
            quick_pick.onDidTriggerButton((button) => {
              if (button.tooltip == 'Close') {
                resolve(undefined)
                quick_pick.hide()
              }
            })
            quick_pick.onDidAccept(() => {
              const selected = quick_pick.selectedItems[0] as any
              resolve(selected)
              quick_pick.hide()
            })
            quick_pick.onDidHide(() => {
              resolve(undefined)
              quick_pick.dispose()
            })
            quick_pick.show()
          })

          if (selected && selected.api_configuration) {
            api_configuration = selected.api_configuration

            let recents =
              panel_provider.context.workspaceState.get<string[]>(
                RECENTLY_USED_VOICE_INPUT_CONFIG_IDS_STATE_KEY
              ) || []
            recents = [
              selected.id!,
              ...recents.filter((id) => id != selected.id!)
            ]
            panel_provider.context.workspaceState.update(
              RECENTLY_USED_VOICE_INPUT_CONFIG_IDS_STATE_KEY,
              recents
            )
          } else {
            return
          }
        }
      }

      panel_provider.send_message({
        command: 'SHOW_PROGRESS',
        title: 'Transcribing...',
        show_elapsed_time: true,
        cancellable: true
      })

      const model_provider = await model_providers_manager.get_model_provider(
        api_configuration!.model_provider_name
      )

      if (!model_provider) {
        vscode.window.showErrorMessage(
          `Model Provider ${api_configuration.model_provider_name} not found.`
        )
        return
      }

      const endpoint_url = model_provider.base_url

      const instructions = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<string>('voiceInputInstructions')

      const body: { [key: string]: any } = {
        model: api_configuration.model,
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

      apply_reasoning_effort({
        body,
        model_provider,
        reasoning_effort: api_configuration.reasoning_effort
      })

      panel_provider.api_call_cancel_token_source = axios.CancelToken.source()

      const result = await make_api_request({
        endpoint_url,
        api_key: model_provider.api_key,
        body,
        cancellation_token: panel_provider.api_call_cancel_token_source.token
      })

      if (result?.response) {
        if (result.response.trim().toUpperCase() == 'INAUDIBLE') {
          panel_provider.send_message({
            command: 'SHOW_AUTO_CLOSING_MODAL',
            title: 'Inaudible voice input',
            type: 'warning'
          })
        } else {
          panel_provider.add_text_at_cursor_position(result.response)
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
    const api_configurations = await model_providers_manager.get_api_configurations()

    if (api_configurations.length == 0) {
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
