import * as vscode from 'vscode'
import * as os from 'os'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { spawn } from 'child_process'
import { CLI_AGENTS } from './agents'
import { Logger } from '@shared/utils/logger'
import { ConfigAgentConfigurationFormat } from '@/utils/cli-configuration-format-converters'
import { AGENTS } from '@/constants/agents'

let _output_channel: vscode.OutputChannel | undefined

const get_output_channel = () => {
  if (!_output_channel) {
    _output_channel = vscode.window.createOutputChannel('CWC Agent')
  }
  return _output_channel
}

export const invoke_agentic_cli = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  build_prompt: (selected_root: string) => Promise<string>
  title: string
  waiting_message: string
  last_used_agent_config_name?: string
  last_selected_workspace_state_key: string
  show_back_button?: boolean
  cli_prompt_type?: 'edit-files' | 'ask-about-files'
  agent_configuration_name?: string
  use_quick_pick?: boolean
  on_agent_selected?: (name: string) => void
}): Promise<
  { agent_output: string; selected_root: string } | undefined | 'back'
> => {
  const roots = params.workspace_provider.get_workspace_roots()

  if (roots.length == 0) {
    return undefined
  }

  const output_channel = get_output_channel()
  let go_back_to_caller = false

  let current_agent_config_name = params.agent_configuration_name
  let show_quick_pick = params.use_quick_pick

  while (true) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const agents_config =
      config.get<ConfigAgentConfigurationFormat[]>('agents', []) || []

    if (agents_config.length === 0) {
      vscode.window.showInformationMessage(
        t('utils.agentic-cli-invocation.info.no-agents')
      )
      return undefined
    }

    const close_button = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }

    let selected_agent_cmd: string | undefined
    let flags_string: string | undefined
    let selected_config_name: string | undefined

    if (current_agent_config_name !== undefined) {
      const config_item = agents_config.find(
        (c) => c.name === current_agent_config_name
      )
      if (config_item) {
        const agent_info = CLI_AGENTS.find(
          (a) => a.label === config_item.agent
        )
        if (agent_info) {
          selected_agent_cmd = agent_info.cmd
          flags_string = config_item.flags || ''
          selected_config_name = config_item.name
        }
      }
    } else if (!show_quick_pick) {
      const last_used = params.last_used_agent_config_name
      if (last_used) {
        const config_item = agents_config.find((c) => c.name === last_used)
        if (config_item) {
          const agent_info = CLI_AGENTS.find(
            (a) => a.label === config_item.agent
          )
          if (agent_info) {
            selected_agent_cmd = agent_info.cmd
            flags_string = config_item.flags || ''
            selected_config_name = config_item.name
          }
        }
      }

      if (!selected_agent_cmd && agents_config.length === 1) {
        const config_item = agents_config[0]
        const agent_info = CLI_AGENTS.find(
          (a) => a.label === config_item.agent
        )
        if (agent_info) {
          selected_agent_cmd = agent_info.cmd
          flags_string = config_item.flags || ''
          selected_config_name = config_item.name
        }
      }
    }

    type AgentPickItem = vscode.QuickPickItem & {
      cmd: string
      agent_id: string
      flag_value: string
      config_name: string
    }

    if (!selected_agent_cmd || show_quick_pick) {
      const build_agent_picks = (): AgentPickItem[] => {
        const agent_picks: AgentPickItem[] = []
        const current_agents_config =
          vscode.workspace
            .getConfiguration('codeWebChat')
            .get<ConfigAgentConfigurationFormat[]>('agents', []) || []

        for (const agent_config of current_agents_config) {
          const agent_info = CLI_AGENTS.find(
            (a) => a.label == agent_config.agent
          )
          if (!agent_info) continue

          const is_unnamed =
            !agent_config.name || /^\(\d+\)$/.test(agent_config.name.trim())
          const display_name = is_unnamed
            ? agent_config.agent!
            : agent_config.name!.replace(/ \(\d+\)$/, '')

          const details: string[] = []
          if (!is_unnamed && agent_config.agent) {
            details.push(agent_config.agent)
          }

          if (agent_config.flags) {
            details.push(agent_config.flags)
          }

          agent_picks.push({
            label: display_name,
            description: details.join(' · ') || undefined,
            cmd: agent_info.cmd,
            agent_id: agent_info.id,
            flag_value: agent_config.flags || '',
            config_name: agent_config.name!
          })
        }
        return agent_picks
      }

      const agent_quick_pick = vscode.window.createQuickPick<AgentPickItem>()
      agent_quick_pick.items = build_agent_picks()

      const last_used = params.last_used_agent_config_name
      if (last_used) {
        const active_item = agent_quick_pick.items.find(
          (i) => i.config_name == last_used
        )
        if (active_item) {
          agent_quick_pick.activeItems = [active_item]
        }
      }

      agent_quick_pick.title = t('utils.agentic-cli-invocation.agent.agents')
      agent_quick_pick.placeholder = t(
        'utils.agentic-cli-invocation.agent.agents-placeholder'
      )
      agent_quick_pick.buttons = params.show_back_button
        ? [vscode.QuickInputButtons.Back, close_button]
        : [close_button]
      agent_quick_pick.ignoreFocusOut = !!params.show_back_button

      const config_listener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codeWebChat.agents')) {
          const prev_active = agent_quick_pick.activeItems[0]
          agent_quick_pick.items = build_agent_picks()

          if (prev_active) {
            const item = agent_quick_pick.items.find(
              (i) =>
                i.label === prev_active.label &&
                i.description === prev_active.description
            )
            if (item) {
              agent_quick_pick.activeItems = [item]
            }
          }
        }
      })

      type AgentSelectionResult =
        | 'back'
        | 'settings'
        | undefined
        | { cmd: string; flag_value: string; config_name: string }

      const agent_selection_result = await new Promise<AgentSelectionResult>(
        (resolve) => {
          let is_resolved = false

          agent_quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              is_resolved = true
              resolve('back')
              agent_quick_pick.hide()
            } else if (button === close_button) {
              is_resolved = true
              resolve(undefined)
              agent_quick_pick.hide()
            }
          })

          agent_quick_pick.onDidAccept(() => {
            const selected = agent_quick_pick.selectedItems[0]
            if (selected) {
              is_resolved = true
              resolve({
                cmd: selected.cmd,
                flag_value: selected.flag_value,
                config_name: selected.config_name
              })
              agent_quick_pick.hide()
            }
          })

          agent_quick_pick.onDidHide(() => {
            if (!is_resolved) {
              resolve('back')
            }
            config_listener.dispose()
            agent_quick_pick.dispose()
          })

          agent_quick_pick.show()
        }
      )

      if (agent_selection_result === 'back') {
        return 'back'
      }

      if (!agent_selection_result) {
        return undefined
      }

      if (agent_selection_result === 'settings') {
        await vscode.commands.executeCommand('codeWebChat.settings')
        continue
      }

      selected_agent_cmd = agent_selection_result.cmd
      flags_string = agent_selection_result.flag_value
      selected_config_name = agent_selection_result.config_name
    }

    const selected_agent_info = CLI_AGENTS.find(
      (a) => a.cmd === selected_agent_cmd
    )

    if (selected_agent_info && !selected_agent_info.is_installed()) {
      const response = await vscode.window.showWarningMessage(
        t('utils.agentic-cli-invocation.error.not-installed', {
          agent: selected_agent_info.label
        }),
        t('utils.agentic-cli-invocation.error.installation-instructions')
      )

      if (
        response ==
        t('utils.agentic-cli-invocation.error.installation-instructions')
      ) {
        const agent_label = selected_agent_info.label as keyof typeof AGENTS
        const url = AGENTS[agent_label]?.homepage_url
        if (url) {
          vscode.env.openExternal(vscode.Uri.parse(url))
        }
      }

      show_quick_pick = true
      current_agent_config_name = undefined
      continue
    }

    if (selected_config_name && params.on_agent_selected) {
      params.on_agent_selected(selected_config_name)
    }

    let go_back_to_agent = false

    while (true) {
      let selected_root: string | undefined

      if (roots.length == 1) {
        selected_root = roots[0]
      } else {
        const picks = roots.map((root) => ({
          label: params.workspace_provider.get_workspace_name(root),
          description: root,
          root
        }))

        const last_selected_root =
          params.extension_context.workspaceState.get<string>(
            params.last_selected_workspace_state_key
          )
        const active_item =
          picks.find((p) => p.root == last_selected_root) || picks[0]

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { root: string }
        >()
        quick_pick.items = picks
        if (active_item) {
          quick_pick.activeItems = [active_item]
        }
        quick_pick.title = t(
          'utils.agentic-cli-invocation.agent.select-workspace'
        )
        quick_pick.placeholder = t(
          'utils.agentic-cli-invocation.agent.select-workspace-placeholder'
        )
        quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
        quick_pick.ignoreFocusOut = true

        const res = await new Promise<string | undefined | 'back'>(
          (resolve) => {
            let is_resolved = false

            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                is_resolved = true
                resolve('back')
                quick_pick.hide()
              } else if (button === close_button) {
                is_resolved = true
                resolve(undefined)
                quick_pick.hide()
              }
            })

            quick_pick.onDidAccept(() => {
              const selected = quick_pick.selectedItems[0]
              if (selected) {
                is_resolved = true
                resolve(selected.root)
                quick_pick.hide()
              }
            })

            quick_pick.onDidHide(() => {
              if (!is_resolved) {
                resolve('back')
              }
              quick_pick.dispose()
            })

            quick_pick.show()
          }
        )

        if (res == 'back') {
          go_back_to_agent = true
          show_quick_pick = true
          current_agent_config_name = undefined
          break
        }

        if (!res) {
          return undefined
        }

        selected_root = res
        await params.extension_context.workspaceState.update(
          params.last_selected_workspace_state_key,
          selected_root
        )
      }

      const agent_info = CLI_AGENTS.find(
        (a) => a.cmd == selected_agent_cmd
      )
      if (!agent_info) break

      const executable = agent_info.cmd

      const custom_args: string[] = []
      if (flags_string!.trim()) {
        let current_arg = ''
        let in_single_quote = false
        let in_double_quote = false

        for (let i = 0; i < flags_string!.length; i++) {
          const char = flags_string![i]
          if (char === "'" && !in_double_quote) {
            in_single_quote = !in_single_quote
          } else if (char === '"' && !in_single_quote) {
            in_double_quote = !in_double_quote
          } else if (char === ' ' && !in_single_quote && !in_double_quote) {
            if (current_arg.length > 0) {
              custom_args.push(current_arg)
              current_arg = ''
            }
          } else {
            current_arg += char
          }
        }
        if (current_arg.length > 0) {
          custom_args.push(current_arg)
        }
      }

      if (params.cli_prompt_type === 'ask-about-files') {
        const final_prompt = await params.build_prompt(selected_root!)
        const base_args = agent_info.get_ask_args
          ? agent_info.get_ask_args(final_prompt)
          : [final_prompt]
        const args = [...base_args, ...custom_args]

        const quote_arg = (arg: string) => {
          if (os.platform() === 'win32') {
            return `"${arg.replace(/"/g, '""')}"`
          } else {
            return `'${arg.replace(/'/g, "'\\''")}'`
          }
        }

        const command = [executable, ...args.map(quote_arg)].join(' ')
        const terminal = vscode.window.createTerminal({
          name: `${agent_info.label} (Ask)`,
          cwd: selected_root
        })
        terminal.show()
        terminal.sendText(command)

        return { agent_output: '', selected_root: selected_root! }
      }

      let agent_output = ''
      let raw_stream_output = ''
      let is_cancelled = false

      output_channel.clear()

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: params.title,
            cancellable: true
          },
          async (progress, token) => {
            progress.report({ message: params.waiting_message })

            const final_prompt = await params.build_prompt(selected_root!)

            if (token.isCancellationRequested) {
              is_cancelled = true
              return
            }

            const base_args = agent_info.get_edit_args(final_prompt)
            const args = [...base_args, ...custom_args]

            return new Promise<void>((resolve, reject) => {
              const child = spawn(executable, args, {
                cwd: selected_root,
                shell: false,
                stdio: ['ignore', 'pipe', 'pipe']
              })

              child.stdout.on('data', (data) => {
                const chunk = data.toString()
                output_channel.append(chunk)
                if (agent_info.parse_stream_line) {
                  raw_stream_output += chunk
                  const lines = raw_stream_output.split('\n')
                  raw_stream_output = lines.pop() || ''
                  for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    try {
                      const parsed = JSON.parse(trimmed)
                      const result = agent_info.parse_stream_line(
                        parsed,
                        (msg) => {
                          progress.report({ message: msg })
                        }
                      )

                      if (result?.output !== undefined) {
                        agent_output = result.output
                      }
                    } catch (e) {
                      // Ignore parse errors for partial chunks
                    }
                  }
                } else {
                  agent_output += chunk
                }
              })

              child.stderr.on('data', (data) => {
                const chunk = data.toString()
                output_channel.append(chunk)
              })

              token.onCancellationRequested(() => {
                is_cancelled = true
                child.kill()
                resolve()
              })

              child.on('close', () => {
                if (agent_info.parse_final_output && raw_stream_output.trim()) {
                  try {
                    const parsed = JSON.parse(raw_stream_output.trim())
                    agent_output =
                      agent_info.parse_final_output(parsed, agent_output) ??
                      agent_output
                  } catch (e) {
                    // Ignore
                  }
                }
                Logger.info({
                  function_name: 'invoke_agentic_cli',
                  message: "Agent's response",
                  data: agent_output
                })
                resolve()
              })

              child.on('error', (err) => {
                Logger.error({
                  function_name: 'invoke_agentic_cli',
                  message: 'Agent execution failed',
                  data: err
                })
                reject(err)
              })
            })
          }
        )
      } catch (err) {
        vscode.window.showErrorMessage(
          t('utils.agentic-cli-invocation.error.failed', {
            error: String(err)
          })
        )
        go_back_to_caller = true
        break
      }

      if (is_cancelled) {
        go_back_to_caller = true
        break
      }

      return { agent_output, selected_root: selected_root! }
    }

    if (go_back_to_agent) {
      continue
    }

    if (go_back_to_caller) {
      return 'back'
    }

    break
  }

  return undefined
}
