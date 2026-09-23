import * as vscode from 'vscode'
import * as os from 'os'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { spawn } from 'child_process'
import { HEADLESS_CLI_AGENTS } from './agents'
import { Logger } from '@shared/utils/logger'

let _output_channel: vscode.OutputChannel | undefined

const get_output_channel = () => {
  if (!_output_channel) {
    _output_channel = vscode.window.createOutputChannel('Headless CLI Agent')
  }
  return _output_channel
}

export const invoke_headless_cli = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  build_prompt: (selected_root: string) => Promise<string>
  title: string
  waiting_message: string
  last_used_agent_state_key: string
  last_selected_workspace_state_key: string
  config_key_prefix: string
  show_back_button?: boolean
  cli_prompt_type?: 'edit-files' | 'ask-about-files'
}): Promise<
  { agent_output: string; selected_root: string } | undefined | 'back'
> => {
  const roots = params.workspace_provider.get_workspace_roots()

  if (roots.length == 0) {
    return undefined
  }

  const output_channel = get_output_channel()
  let go_back_to_caller = false
  let active_config_key: string | undefined
  let active_flag_index: number | undefined

  while (true) {
    const available_agents = HEADLESS_CLI_AGENTS.filter((a) => a.is_installed())

    if (available_agents.length == 0) {
      vscode.window.showInformationMessage(
        t('utils.headless-cli-invocation.info.no-agents')
      )
      return undefined
    }

    const add_button = {
      iconPath: new vscode.ThemeIcon('flag'),
      tooltip: t('utils.headless-cli-invocation.agent.add-flags')
    }
    const edit_button = {
      iconPath: new vscode.ThemeIcon('edit'),
      tooltip: t('utils.headless-cli-invocation.agent.edit-flags')
    }
    const delete_button = {
      iconPath: new vscode.ThemeIcon('trash'),
      tooltip: t('utils.headless-cli-invocation.agent.delete-flags')
    }
    const doc_button = {
      iconPath: new vscode.ThemeIcon('question'),
      tooltip: t('common.action.learn-more')
    }

    type AgentPickItem = vscode.QuickPickItem & {
      cmd: string
      agent_id: string
      flag_index: number
      flag_value: string
      configKey: string
    }

    const build_agent_picks = (): AgentPickItem[] => {
      const agent_picks: AgentPickItem[] = []

      for (const a of available_agents) {
        const configKey = `${params.config_key_prefix}${a.id.charAt(0).toUpperCase() + a.id.slice(1)}Flags`
        const config = vscode.workspace.getConfiguration('codeWebChat')
        let flags = config.get<string[]>(configKey)
        if (!Array.isArray(flags)) {
          flags = []
        }

        const custom_flags = flags.filter((f) => f.trim() !== '')
        const display_flags = ['', ...custom_flags]

        display_flags.forEach((flag, index) => {
          const buttons: vscode.QuickInputButton[] = []
          if (index === 0) {
            buttons.push(add_button)
            buttons.push(doc_button)
          } else {
            buttons.push(edit_button)
            buttons.push(delete_button)
          }

          agent_picks.push({
            label: a.label,
            description: flag ? flag : undefined,
            cmd: a.cmd,
            agent_id: a.id,
            flag_index: index > 0 ? index - 1 : -1,
            flag_value: flag,
            configKey,
            buttons
          })
        })
      }
      return agent_picks
    }

    const close_button = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }

    const agent_quick_pick = vscode.window.createQuickPick<AgentPickItem>()
    agent_quick_pick.items = build_agent_picks()

    if (active_config_key !== undefined && active_flag_index !== undefined) {
      const active_item = agent_quick_pick.items.find(
        (i) =>
          i.configKey === active_config_key &&
          i.flag_index === active_flag_index
      )
      if (active_item) {
        agent_quick_pick.activeItems = [active_item]
      }
    } else {
      const last_used_agent =
        params.extension_context.workspaceState.get<string>(
          params.last_used_agent_state_key
        )
      if (last_used_agent) {
        const active_item = agent_quick_pick.items.find(
          (i) => i.cmd == last_used_agent
        )
        if (active_item) {
          agent_quick_pick.activeItems = [active_item]
        }
      }
    }

    agent_quick_pick.title = t(
      'utils.headless-cli-invocation.agent.select-agent'
    )
    agent_quick_pick.placeholder = t(
      'utils.headless-cli-invocation.agent.select-agent-placeholder'
    )
    agent_quick_pick.buttons = params.show_back_button
      ? [vscode.QuickInputButtons.Back, close_button]
      : [close_button]
    agent_quick_pick.ignoreFocusOut = !!params.show_back_button

    const config_listener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codeWebChat')) {
        const prev_active = agent_quick_pick.activeItems[0]
        agent_quick_pick.items = build_agent_picks()

        if (
          active_config_key !== undefined &&
          active_flag_index !== undefined
        ) {
          const item = agent_quick_pick.items.find(
            (i) =>
              i.configKey === active_config_key &&
              i.flag_index === active_flag_index
          )
          if (item) {
            agent_quick_pick.activeItems = [item]
          }
        } else if (prev_active) {
          const item = agent_quick_pick.items.find(
            (i) =>
              i.configKey === prev_active.configKey &&
              i.flag_index === prev_active.flag_index
          )
          if (item) {
            agent_quick_pick.activeItems = [item]
          }
        }
      }
    })

    type AgentSelectionResult =
      | 'back'
      | undefined
      | { action: 'run'; cmd: string; flag_value: string }
      | { action: 'edit'; configKey: string; index: number; value: string }
      | { action: 'add'; configKey: string }

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

        agent_quick_pick.onDidTriggerItemButton((e) => {
          if (e.button === doc_button) {
            const agent = available_agents.find((a) => a.cmd == e.item.cmd)
            if (agent) {
              vscode.env.openExternal(
                vscode.Uri.parse(agent.get_documentation_url())
              )
            }
          } else if (e.button === edit_button) {
            is_resolved = true
            resolve({
              action: 'edit',
              configKey: e.item.configKey,
              index: e.item.flag_index,
              value: e.item.flag_value
            })
            agent_quick_pick.hide()
          } else if (e.button === add_button) {
            is_resolved = true
            resolve({ action: 'add', configKey: e.item.configKey })
            agent_quick_pick.hide()
          } else if (e.button === delete_button) {
            active_config_key = e.item.configKey
            active_flag_index = -1

            const config = vscode.workspace.getConfiguration('codeWebChat')
            const flags = config
              .get<string[]>(e.item.configKey, [])
              .filter((f) => f.trim() !== '')
            const deleted_flag = flags[e.item.flag_index]
            const new_flags_array = flags.filter(
              (_, i) => i !== e.item.flag_index
            )

            config
              .update(
                e.item.configKey,
                new_flags_array,
                vscode.ConfigurationTarget.Global
              )
              .then(() => {
                const undo_action = t('common.undo')
                vscode.window
                  .showInformationMessage(
                    t('common.success.item-deleted', { item: 'Flags' }),
                    undo_action
                  )
                  .then((choice) => {
                    if (choice === undo_action) {
                      active_config_key = e.item.configKey
                      active_flag_index = e.item.flag_index

                      const current_config =
                        vscode.workspace.getConfiguration('codeWebChat')
                      const current_flags = current_config
                        .get<string[]>(e.item.configKey, [])
                        .filter((f) => f.trim() !== '')
                      current_flags.splice(e.item.flag_index, 0, deleted_flag)
                      current_config.update(
                        e.item.configKey,
                        current_flags,
                        vscode.ConfigurationTarget.Global
                      )
                    }
                  })
              })
          }
        })

        agent_quick_pick.onDidAccept(() => {
          const selected = agent_quick_pick.selectedItems[0]
          if (selected) {
            is_resolved = true
            resolve({
              action: 'run',
              cmd: selected.cmd,
              flag_value: selected.flag_value
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

    if (agent_selection_result.action === 'add') {
      const { configKey } = agent_selection_result
      active_config_key = configKey
      active_flag_index = -1

      const new_flags = await vscode.window.showInputBox({
        title: t('utils.headless-cli-invocation.agent.add-flags'),
        prompt: t('utils.headless-cli-invocation.agent.edit-flags-prompt'),
        placeHolder: t(
          'utils.headless-cli-invocation.agent.edit-flags-placeholder'
        ),
        value: '',
        ignoreFocusOut: true
      })
      if (new_flags !== undefined && new_flags.trim() !== '') {
        const config = vscode.workspace.getConfiguration('codeWebChat')
        const flags = config
          .get<string[]>(configKey, [])
          .filter((f) => f.trim() !== '')

        active_flag_index = flags.length

        await config.update(
          configKey,
          [...flags, new_flags],
          vscode.ConfigurationTarget.Global
        )
      }
      continue
    }

    if (agent_selection_result.action === 'edit') {
      const { configKey, index, value } = agent_selection_result
      active_config_key = configKey
      active_flag_index = index

      const new_flags = await vscode.window.showInputBox({
        title: t('utils.headless-cli-invocation.agent.edit-flags'),
        prompt: t('utils.headless-cli-invocation.agent.edit-flags-prompt'),
        placeHolder: t(
          'utils.headless-cli-invocation.agent.edit-flags-placeholder'
        ),
        value: value,
        ignoreFocusOut: true
      })
      if (new_flags !== undefined) {
        const config = vscode.workspace.getConfiguration('codeWebChat')
        const flags = config
          .get<string[]>(configKey, [])
          .filter((f) => f.trim() !== '')
        const new_flags_array = [...flags]
        if (new_flags.trim() !== '') {
          new_flags_array[index] = new_flags
        } else {
          new_flags_array.splice(index, 1)
          active_flag_index = -1
        }
        await config.update(
          configKey,
          new_flags_array,
          vscode.ConfigurationTarget.Global
        )
      }
      continue
    }

    const selected_agent_cmd = agent_selection_result.cmd
    const flags_string = agent_selection_result.flag_value

    await params.extension_context.workspaceState.update(
      params.last_used_agent_state_key,
      selected_agent_cmd
    )

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
          'utils.headless-cli-invocation.agent.select-workspace'
        )
        quick_pick.placeholder = t(
          'utils.headless-cli-invocation.agent.select-workspace-placeholder'
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

      const agent_info = available_agents.find(
        (a) => a.cmd == selected_agent_cmd
      )
      if (!agent_info) break

      const executable = agent_info.cmd

      const custom_args: string[] = []
      if (flags_string.trim()) {
        let current_arg = ''
        let in_single_quote = false
        let in_double_quote = false

        for (let i = 0; i < flags_string.length; i++) {
          const char = flags_string[i]
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
                  function_name: 'invoke_headless_cli',
                  message: "Agent's response",
                  data: agent_output
                })
                resolve()
              })

              child.on('error', (err) => {
                Logger.error({
                  function_name: 'invoke_headless_cli',
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
          t('utils.headless-cli-invocation.error.failed', {
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
