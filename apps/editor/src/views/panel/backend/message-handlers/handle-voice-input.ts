import { PanelProvider } from '../panel-provider'
import { SetRecordingStateMessage } from '../../types/messages'
import { spawn } from 'child_process'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'
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
      const configs =
        await model_providers_manager.get_voice_input_tool_configs()

      if (configs.length == 0) return

      let config: ToolConfig | undefined =
        await model_providers_manager.get_default_voice_input_config()

      if (!config) {
        if (configs.length == 1) {
          config = configs[0]
        } else {
          const recent_ids =
            panel_provider.context.workspaceState.get<string[]>(
              RECENTLY_USED_VOICE_INPUT_CONFIG_IDS_STATE_KEY
            ) || []

          const matched_recent_configs: ToolConfig[] = []
          const remaining_configs: ToolConfig[] = []

          configs.forEach((config) => {
            const id = get_tool_config_id(config)
            if (recent_ids.includes(id)) {
              matched_recent_configs.push(config)
            } else {
              remaining_configs.push(config)
            }
          })

          matched_recent_configs.sort((a, b) => {
            const id_a = get_tool_config_id(a)
            const id_b = get_tool_config_id(b)
            return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
          })

          const map_config_to_item = (config: ToolConfig) => ({
            label: config.model,
            description: config.provider_name,
            config,
            id: get_tool_config_id(config)
          })

          const items: (vscode.QuickPickItem & {
            config?: ToolConfig
            id?: string
          })[] = []

          if (matched_recent_configs.length > 0) {
            items.push({
              label: 'recently used',
              kind: vscode.QuickPickItemKind.Separator
            })
            items.push(...matched_recent_configs.map(map_config_to_item))
          }

          if (remaining_configs.length > 0) {
            if (matched_recent_configs.length > 0) {
              items.push({
                label: 'other configurations',
                kind: vscode.QuickPickItemKind.Separator
              })
            }
            items.push(...remaining_configs.map(map_config_to_item))
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
                config?: ToolConfig
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

          if (selected && selected.config) {
            config = selected.config

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
