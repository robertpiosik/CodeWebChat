import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { PromptViewProvider } from '../prompt-view-provider'
import { SetRecordingStateMessage } from '../../types/messages'
import { spawn } from 'child_process'
import { Logger } from '@shared/utils/logger'
import { ProvidersManager } from '@/services/providers-manager'
import * as vscode from 'vscode'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import axios from 'axios'
import { send_llm_message } from '@/utils/send-llm-message'
import {
  voice_input_output_formatting,
  cli_edit_ask_requirements
} from '@/constants/instructions'
import {
  LAST_USED_VOICE_INPUT_CONFIG_ID_STATE_KEY,
  LAST_USED_VOICE_INPUT_ACTION_STATE_KEY,
  LAST_SELECTED_WORKSPACE_FOR_VOICE_INPUT_STATE_KEY,
  LAST_USED_AGENT_FOR_VOICE_INPUT_STATE_KEY
} from '@/constants/state-keys'
import { t } from '@/i18n'
import { get_api_configuration } from '@/utils/get-api-configuration'
import { show_incomplete_setup_warning } from '@/utils/show-missing-configuration-notification'
import { get_error_message } from '@/utils/get-error-message'
import { invoke_agentic_cli } from '@/utils/agentic-cli-invocation'

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

    prompt_view_provider.recording_process.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code == 'ENOENT') {
        let error_message = t(
          'views.prompt.handlers.handle-voice-input.error.sox-missing'
        )

        if (process.platform == 'darwin') {
          error_message = t(
            'views.prompt.handlers.handle-voice-input.error.sox-missing.mac'
          )
        } else if (process.platform == 'linux') {
          error_message = t(
            'views.prompt.handlers.handle-voice-input.error.sox-missing.linux'
          )
        } else if (process.platform == 'win32') {
          error_message = t(
            'views.prompt.handlers.handle-voice-input.error.sox-missing.windows'
          )
        }

        const learn_more = t('common.action.learn-more')

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
          t('views.prompt.handlers.handle-voice-input.error.start-failed', {
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
  } catch (error) {
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

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const default_option = config.get<'ask' | 'send-request' | 'invoke-agent'>(
      'defaultOptionForVoiceInput'
    )
    const voice_input_task_instructions = config.get<string>(
      'voiceInputInstructions'
    )

    let current_action =
      prompt_view_provider.extension_context.workspaceState.get<string>(
        LAST_USED_VOICE_INPUT_ACTION_STATE_KEY
      )
    let show_action_quick_pick = true

    if (default_option == 'send-request') {
      current_action = 'send-request'
      show_action_quick_pick = false
    } else if (default_option == 'invoke-agent') {
      current_action = 'invoke-agent'
      show_action_quick_pick = false
    }

    while (true) {
      if (show_action_quick_pick) {
        current_action = await new Promise<string | undefined | 'back'>(
          (resolve) => {
            const quick_pick = vscode.window.createQuickPick<
              vscode.QuickPickItem & { id: string }
            >()
            quick_pick.items = [
              { label: t('common.action.send-request'), id: 'send-request' },
              { label: t('common.action.invoke-agent'), id: 'invoke-agent' }
            ]
            const active_item = current_action
              ? quick_pick.items.find((i) => i.id === current_action)
              : undefined
            if (active_item) quick_pick.activeItems = [active_item]
            else if (quick_pick.items.length > 0)
              quick_pick.activeItems = [quick_pick.items[0]]

            quick_pick.title = t(
              'views.prompt.handlers.handle-voice-input.title'
            )
            quick_pick.placeholder = t(
              'common.action-quick-pick.placeholder.no-tokens'
            )
            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: t('common.close')
            }
            quick_pick.buttons = [close_button]

            let is_resolved = false
            quick_pick.onDidTriggerButton((button) => {
              if (button === close_button) {
                is_resolved = true
                resolve(undefined)
                quick_pick.hide()
              }
            })
            quick_pick.onDidAccept(() => {
              is_resolved = true
              resolve(quick_pick.selectedItems[0]?.id)
              quick_pick.hide()
            })
            quick_pick.onDidHide(() => {
              if (!is_resolved) {
                resolve(undefined)
              }
              quick_pick.dispose()
            })
            quick_pick.show()
          }
        )

        if (!current_action || current_action === 'back') return

        await prompt_view_provider.extension_context.workspaceState.update(
          LAST_USED_VOICE_INPUT_ACTION_STATE_KEY,
          current_action
        )
      }

      show_action_quick_pick = false

      if (current_action == 'invoke-agent') {
        const temp_audio_path = path.join(
          os.tmpdir(),
          `cwc-voice-input-${Date.now()}.wav`
        )
        await fs.promises.writeFile(temp_audio_path, audio_buffer)

        const cli_prompt = `# Task\n\n${voice_input_task_instructions}\n\nAudio file: \`${temp_audio_path.replace(/\\/g, '/')}\`\n\n# Output formatting\n\n${voice_input_output_formatting}\n\n# Requirements\n\n- ${cli_edit_ask_requirements.disable_tool_calling}\n- ${cli_edit_ask_requirements.exception_read_audio}`

        const invoke_cli_result = await invoke_agentic_cli({
          workspace_provider: prompt_view_provider.workspace_provider,
          extension_context: prompt_view_provider.extension_context,
          build_prompt: async () => cli_prompt,
          notification_title: t(
            'views.prompt.handlers.handle-voice-input.title'
          ),
          last_selected_workspace_state_key:
            LAST_SELECTED_WORKSPACE_FOR_VOICE_INPUT_STATE_KEY,
          agent_state_key: LAST_USED_AGENT_FOR_VOICE_INPUT_STATE_KEY,
          default_agent_key: 'isDefaultForVoiceInput',
          show_back_button: true,
          isolate_in_temp_dir: true
        })

        if (invoke_cli_result === 'back') {
          show_action_quick_pick = true
          continue
        }

        if (!invoke_cli_result) {
          return
        }

        const text = invoke_cli_result.agent_output
        if (text.trim().toUpperCase() == 'INAUDIBLE') {
          prompt_view_provider.send_message({
            command: 'SHOW_AUTO_CLOSING_MODAL',
            title: t(
              'views.prompt.handlers.handle-voice-input.warning.inaudible'
            )
          })
        } else {
          prompt_view_provider.add_text_at_cursor_position(text)
        }
        break
      } else if (current_action == 'send-request') {
        let show_quick_pick = false

        while (true) {
          try {
            const providers_manager = new ProvidersManager(
              prompt_view_provider.extension_context
            )

            const api_configuration_result = await get_api_configuration({
              providers_manager,
              extension_context: prompt_view_provider.extension_context,
              last_used_state_key: LAST_USED_VOICE_INPUT_CONFIG_ID_STATE_KEY,
              default_api_configuration:
                await providers_manager.get_default_voice_input_api_configuration(),
              caller_name: 'stop_recording',
              show_quick_pick: show_quick_pick
            })

            if (api_configuration_result === 'back') {
              show_action_quick_pick = true
              break
            }

            if (!api_configuration_result) {
              return
            }

            const { provider, api_configuration } = api_configuration_result

            prompt_view_provider.send_message({
              command: 'SHOW_PROGRESS',
              title: t(
                'views.prompt.handlers.handle-voice-input.progress.transcribing'
              ),
              cancellable: true
            })

            const body: { [key: string]: any } = {
              model: api_configuration.model,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `# Task\n\n${voice_input_task_instructions}\n\n# Output formatting\n\n${voice_input_output_formatting}`
                    },
                    {
                      type: 'input_audio',
                      input_audio: { data: base64_audio, format: 'wav' }
                    }
                  ]
                }
              ]
            }

            apply_reasoning_effort({
              body,
              provider,
              reasoning_effort: api_configuration.reasoning_effort
            })

            prompt_view_provider.api_call_abort_controller =
              new AbortController()

            const result = await send_llm_message({
              base_url: provider.base_url,
              api_key: provider.api_key,
              body,
              abort_signal:
                prompt_view_provider.api_call_abort_controller.signal
            })

            if (result?.response) {
              if (result.response.trim().toUpperCase() == 'INAUDIBLE') {
                prompt_view_provider.send_message({
                  command: 'SHOW_AUTO_CLOSING_MODAL',
                  title: t(
                    'views.prompt.handlers.handle-voice-input.warning.inaudible'
                  )
                })
              } else {
                prompt_view_provider.add_text_at_cursor_position(
                  result.response
                )
              }
            }
            break // success
          } catch (error) {
            if (axios.isCancel(error)) {
              return
            }

            Logger.error({
              function_name: 'stop_recording',
              message: 'Failed to process audio',
              data: { error }
            })
            vscode.window.showErrorMessage(
              t(
                'views.prompt.handlers.handle-voice-input.error.process-failed',
                {
                  error: get_error_message(error)
                }
              )
            )
            show_quick_pick = true
          } finally {
            prompt_view_provider.api_call_abort_controller = null
            prompt_view_provider.send_message({ command: 'HIDE_PROGRESS' })
          }
        }
        if (show_action_quick_pick) continue
        break
      }
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
    const providers_manager = new ProvidersManager(
      prompt_view_provider.extension_context
    )
    const api_configurations = await providers_manager.get_api_configurations()

    const config_codeWebChat = vscode.workspace.getConfiguration('codeWebChat')
    const agent_configs = config_codeWebChat.get<any[]>('agents', []) || []

    if (api_configurations.length == 0 && agent_configs.length == 0) {
      show_incomplete_setup_warning('api')
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
