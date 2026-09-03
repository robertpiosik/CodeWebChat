import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { execSync, spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import {
  LAST_SELECTED_WORKSPACE_IN_AGENT_SEARCH_STATE_KEY,
  LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY
} from '@/constants/state-keys'
import { agentic_file_search_instructions } from '@/constants/instructions'
import { extract_paths_from_text } from '@/utils/extract-paths-from-text'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { Logger } from '@shared/utils/logger'
import { show_search_results_quick_pick } from '../utils/show-search-results-quick-pick'
import { prompt_for_search_term } from '../utils/prompt-for-search-term'

const check_command_exists = (cmd: string): boolean => {
  try {
    const is_windows = os.platform() == 'win32'
    execSync(`${is_windows ? 'where' : 'command -v'} ${cmd}`, {
      stdio: 'ignore'
    })
    return true
  } catch (e) {
    return false
  }
}

export const perform_agent_search_mode = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
  search_in_results: (
    matched_paths: string[]
  ) => Promise<
    | { selected_paths: string[]; matched_paths: string[]; title: string }
    | undefined
    | 'back'
  >
  is_search_in_selected?: boolean
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | undefined
  | 'back'
> => {
  const local_queries: Record<string, string> = {}

  const roots = params.workspace_provider.get_workspace_roots()

  if (roots.length == 0) {
    return undefined
  }

  while (true) {
    const available_agents: {
      label: string
      cmd: string
      executable: string
      args: string[]
    }[] = []

    if (check_command_exists('agy')) {
      available_agents.push({
        label: 'Antigravity',
        cmd: 'agy',
        executable: 'agy',
        args: ['-p']
      })
    }

    if (check_command_exists('codex')) {
      available_agents.push({
        label: 'Codex',
        cmd: 'codex',
        executable: 'codex',
        args: ['e']
      })
    }

    if (check_command_exists('claude')) {
      available_agents.push({
        label: 'Claude Code',
        cmd: 'claude',
        executable: 'claude',
        args: ['-p']
      })
    }

    if (available_agents.length == 0) {
      vscode.window.showInformationMessage(
        t('feature.search-files.agent.no-agents')
      )
      return undefined
    }

    const agent_picks = available_agents.map((a) => ({
      label: a.label,
      cmd: a.cmd
    }))

    const close_button = {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }

    const agent_quick_pick = vscode.window.createQuickPick<
      vscode.QuickPickItem & { cmd: string }
    >()
    agent_quick_pick.items = agent_picks
    agent_quick_pick.title = t('feature.search-files.agent.select-agent')
    agent_quick_pick.placeholder = t(
      'feature.search-files.agent.select-agent-placeholder'
    )
    agent_quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
    agent_quick_pick.ignoreFocusOut = true

    const selected_agent = await new Promise<string | undefined | 'back'>(
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
            resolve(selected.cmd)
            agent_quick_pick.hide()
          }
        })

        agent_quick_pick.onDidHide(() => {
          if (!is_resolved) {
            resolve(undefined)
          }
          agent_quick_pick.dispose()
        })

        agent_quick_pick.show()
      }
    )

    if (selected_agent == 'back') {
      return 'back'
    }

    if (!selected_agent) {
      return undefined
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

        const last_selected_root = params.extension_context.workspaceState.get<string>(
          LAST_SELECTED_WORKSPACE_IN_AGENT_SEARCH_STATE_KEY
        )
        const active_item =
          picks.find((p) => p.root === last_selected_root) || picks[0]

        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { root: string }
        >()
        quick_pick.items = picks
        if (active_item) {
          quick_pick.activeItems = [active_item]
        }
        quick_pick.title = t('feature.search-files.agent.select-workspace')
        quick_pick.placeholder = t(
          'feature.search-files.agent.select-workspace-placeholder'
        )
        quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
        quick_pick.ignoreFocusOut = true

        const res = await new Promise<string | undefined | 'back'>((resolve) => {
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
              resolve(undefined)
            }
            quick_pick.dispose()
          })

          quick_pick.show()
        })

        if (res == 'back') {
          go_back_to_agent = true
          break
        }

        if (!res) {
          return undefined
        }

        selected_root = res
        await params.extension_context.workspaceState.update(
          LAST_SELECTED_WORKSPACE_IN_AGENT_SEARCH_STATE_KEY,
          selected_root
        )
      }

      let go_back_to_workspace = false

      while (true) {
        const initial_query =
          local_queries[LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY] !== undefined
            ? local_queries[LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY]
            : params.show_back_button
              ? ''
              : params.extension_context.workspaceState.get<string>(
                  LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY
                ) || ''

        const query_result = await prompt_for_search_term(
          initial_query,
          'agent',
          undefined,
          (value) => {
            local_queries[LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY] = value
            if (!params.show_back_button) {
              params.extension_context.workspaceState.update(
                LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY,
                value
              )
            }
          }
        )

        if (query_result.back) {
          if (roots.length > 1) {
            go_back_to_workspace = true
          } else {
            go_back_to_agent = true
          }
          break
        }

        if (query_result.value === undefined) {
          return undefined
        }

        const query = query_result.value

        if (query.trim() == '') {
          continue
        }

        local_queries[LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY] = query
        if (!params.show_back_button) {
          await params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY,
            query
          )
        }

        const agent_info = available_agents.find((a) => a.cmd === selected_agent)
        if (!agent_info) break

        const executable = agent_info.executable
        const args = [...agent_info.args]

        const full_prompt = `${agentic_file_search_instructions}\n\n${query}`
        args.push(full_prompt)

        if (executable == 'agy') {
          args.push('--output-format', 'stream-json', '--dangerously-skip-permissions')
        }

        let agent_output = ''
        let raw_stream_output = ''
        let is_cancelled = false

        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              cancellable: true
            },
            async (progress, token) => {
              progress.report({ message: t('feature.search-files.progress.searching') })

              return new Promise<void>((resolve, reject) => {
                const child = spawn(executable, args, {
                  cwd: selected_root,
                  shell: false // Prevents syntax breakage and command injection from newlines/quotes
                })

                child.stdout.on('data', (data) => {
                  const chunk = data.toString()
                  if (executable == 'agy') {
                    raw_stream_output += chunk
                    const lines = raw_stream_output.split('\n')
                    raw_stream_output = lines.pop() || ''
                    for (const line of lines) {
                      const trimmed = line.trim()
                      if (!trimmed) continue
                      try {
                        const parsed = JSON.parse(trimmed)
                        if (parsed.event == 'step_update' && parsed.step_update) {
                          const step = parsed.step_update
                          if (step.step_type == 'tool') {
                            const tool_name = step.tool_name || step.tool_info?.name
                            if (tool_name) {
                              let msg = `Using ${tool_name.replace(/_/g, ' ')}...`
                              const params = step.tool_info?.parameters
                              
                              if (params) {
                                if (tool_name == 'run_command' && (params.CommandLine || params.command)) {
                                  msg = `Running: ${params.CommandLine || params.command}`
                                } else if (tool_name == 'read_file' && params.path) {
                                  msg = `Reading: ${params.path}`
                                } else if ((tool_name == 'write_file' || tool_name == 'write_to_file') && params.path) {
                                  msg = `Writing: ${params.path}`
                                } else if (tool_name == 'list_directory' && params.path) {
                                  msg = `Listing: ${params.path}`
                                } else if (tool_name == 'search_files' && (params.query || params.pattern)) {
                                  msg = `Searching: ${params.query || params.pattern}`
                                }
                              }
                              
                              if (msg.length > 60) {
                                msg = msg.substring(0, 57) + '...'
                              }
                              progress.report({ message: msg })
                            }
                          } else if (step.subagent_info?.subagents?.length > 0) {
                            const subagent = step.subagent_info.subagents[0]
                            progress.report({ message: `Delegating to ${subagent.role || subagent.type_name}...` })
                          } else if (step.step_type == 'agent_response') {
                            progress.report({ message: 'Synthesizing results...' })
                          }
                        } else if (parsed.event == 'result' && parsed.result) {
                          agent_output = parsed.result.response || ''
                        }
                      } catch (e) {
                        // Ignore parse errors for partial chunks
                      }
                    }
                  } else {
                    agent_output += chunk
                  }
                })

                child.stderr.on('data', () => {
                  // Ignore stderr
                })

                token.onCancellationRequested(() => {
                  is_cancelled = true
                  child.kill()
                  resolve()
                })

                child.on('close', () => {
                  if (executable == 'agy' && raw_stream_output.trim()) {
                    try {
                      const parsed = JSON.parse(raw_stream_output.trim())
                      if (parsed.event == 'result' && parsed.result) {
                        agent_output = parsed.result.response || ''
                      } else if (parsed.response) {
                        agent_output = parsed.response || ''
                      }
                    } catch (e) {
                      // Ignore
                    }
                  }
                  resolve()
                })

                child.on('error', (err) => {
                  Logger.error({
                    function_name: 'perform_agent_search_mode',
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
            t('feature.search-files.failed', { error: String(err) })
          )
          continue
        }

        if (is_cancelled) {
          continue
        }

        if (agent_output.trim() == '') {
          vscode.window.showInformationMessage(t('feature.search-files.no-files'))
          continue
        }

        const all_workspace_files = await get_all_workspace_files({
          workspace_provider: params.workspace_provider
        })

        let workspace_files = all_workspace_files
        let prefix = ''

        if (roots.length > 1 && selected_root) {
          const workspace_name = params.workspace_provider.get_workspace_name(selected_root)
          prefix = `${workspace_name}/`
          const root_files = workspace_files.filter((f) => f.startsWith(prefix))
          const stripped_files = root_files.map((f) => f.substring(prefix.length))
          workspace_files = [...root_files, ...stripped_files]
        }

        const valid_paths = extract_paths_from_text({
          text: agent_output,
          workspace_files
        })

        const absolute_paths = Array.from(
          new Set(
            valid_paths.map((p) => {
              const relative_path = prefix && p.startsWith(prefix) ? p.substring(prefix.length) : p
              return path.join(selected_root!, relative_path)
            })
          )
        ).filter((p) => fs.existsSync(p))

        if (absolute_paths.length === 0) {
          vscode.window.showInformationMessage(t('feature.search-files.no-files'))
          continue
        }

        let should_go_back_to_query = false
        let restored_selected_paths: string[] | undefined = undefined
        let restored_unmatched_paths: string[] | undefined = undefined
        let final_decision:
          | { selected_paths: string[]; matched_paths: string[]; title: string }
          | undefined

        while (true) {
          const currently_checked = params.workspace_provider.get_checked_files()
          const unmatched_checked_files =
            restored_unmatched_paths ??
            (params.is_search_in_selected
              ? currently_checked.filter((f) => !absolute_paths.includes(f))
              : [])

          const selected_items = (await show_search_results_quick_pick({
            matched_items: absolute_paths.map((path) => ({ path })),
            unmatched_checked_paths: unmatched_checked_files,
            workspace_provider: params.workspace_provider,
            title: t('feature.search-files.results'),
            show_back_button: true,
            restored_selected_paths
          })) as any

          if (selected_items == 'back') {
            should_go_back_to_query = true
            break
          }

          if (!selected_items) {
            return undefined
          }

          if ('action' in selected_items) {
            const sub_search_result = await params.search_in_results(
              selected_items.matched_paths
            )

            if (sub_search_result == 'back') {
              restored_selected_paths = selected_items.selected_paths
              restored_unmatched_paths = selected_items.unmatched_paths
              continue
            }
            return sub_search_result
          }

          final_decision = selected_items
          break
        }

        if (should_go_back_to_query) {
          continue
        }

        if (final_decision) {
          return final_decision
        }
      }

      if (go_back_to_workspace) {
        continue
      }
      break
    }

    if (go_back_to_agent) {
      continue
    }

    break
  }

  return undefined
}
