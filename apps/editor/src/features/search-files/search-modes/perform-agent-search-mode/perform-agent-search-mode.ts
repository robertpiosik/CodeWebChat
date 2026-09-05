import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import {
  LAST_SELECTED_WORKSPACE_IN_AGENT_SEARCH_STATE_KEY,
  LAST_SEARCH_FILES_AGENT_QUERY_STATE_KEY
} from '@/constants/state-keys'
import { extract_paths_from_bullet_list } from '@/utils/extract-paths-from-bullet-list'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { Logger } from '@shared/utils/logger'
import { show_search_results_quick_pick } from '../../utils/show-search-results-quick-pick'
import { prompt_for_search_term } from '../../utils/prompt-for-search-term'
import { antigravity_agent } from './agents/antigravity'
import { claude_agent } from './agents/claude'
import { codex_agent } from './agents/codex'
import { cursor_agent } from './agents/cursor'
import { opencode_agent } from './agents/opencode'
import { grok_agent } from './agents/grok'
import { muse_agent } from './agents/muse'
import { CodingAgent } from './types'
import { format_duration } from './utils'

const AGENTS: CodingAgent[] = [
  antigravity_agent,
  codex_agent,
  claude_agent,
  cursor_agent,
  grok_agent,
  muse_agent,
  opencode_agent
]

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
      return 'back'
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

    let go_back_to_query = false

    while (true) {
      const available_agents = AGENTS.filter((a) => a.is_installed())

      if (available_agents.length == 0) {
        vscode.window.showInformationMessage(
          t('feature.search-files.agent.no-agents')
        )
        return undefined
      }

      const add_button = {
        iconPath: new vscode.ThemeIcon('flag'),
        tooltip: t('feature.search-files.agent.add-flags')
      }
      const edit_button = {
        iconPath: new vscode.ThemeIcon('edit'),
        tooltip: t('feature.search-files.agent.edit-flags')
      }
      const delete_button = {
        iconPath: new vscode.ThemeIcon('trash'),
        tooltip: t('feature.search-files.agent.delete-flags')
      }
      const doc_button = {
        iconPath: new vscode.ThemeIcon('question'),
        tooltip: t('feature.search-files.agent.learn-more')
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
          const configKey = `agenticSearch${
            a.id.charAt(0).toUpperCase() + a.id.slice(1)
          }Flags`
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
      agent_quick_pick.title = t('feature.search-files.agent.select-agent')
      agent_quick_pick.placeholder = t(
        'feature.search-files.agent.select-agent-placeholder'
      )
      agent_quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
      agent_quick_pick.ignoreFocusOut = true

      const config_listener = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('codeWebChat')) {
          agent_quick_pick.items = build_agent_picks()
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
                      t('feature.search-files.agent.deleted'),
                      undo_action
                    )
                    .then((choice) => {
                      if (choice === undo_action) {
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
              resolve(undefined)
            }
            config_listener.dispose()
            agent_quick_pick.dispose()
          })

          agent_quick_pick.show()
        }
      )

      if (agent_selection_result == 'back') {
        go_back_to_query = true
        break
      }

      if (!agent_selection_result) {
        return undefined
      }

      if (agent_selection_result.action === 'add') {
        const { configKey } = agent_selection_result
        const new_flags = await vscode.window.showInputBox({
          title: t('feature.search-files.agent.add-flags'),
          prompt: t('feature.search-files.agent.edit-flags-prompt'),
          placeHolder: t('feature.search-files.agent.edit-flags-placeholder'),
          value: '',
          ignoreFocusOut: true
        })
        if (new_flags !== undefined && new_flags.trim() !== '') {
          const config = vscode.workspace.getConfiguration('codeWebChat')
          const flags = config
            .get<string[]>(configKey, [])
            .filter((f) => f.trim() !== '')
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
        const new_flags = await vscode.window.showInputBox({
          title: t('feature.search-files.agent.edit-flags'),
          prompt: t('feature.search-files.agent.edit-flags-prompt'),
          placeHolder: t('feature.search-files.agent.edit-flags-placeholder'),
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
              LAST_SELECTED_WORKSPACE_IN_AGENT_SEARCH_STATE_KEY
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
          quick_pick.title = t('feature.search-files.agent.select-workspace')
          quick_pick.placeholder = t(
            'feature.search-files.agent.select-workspace-placeholder'
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
                  resolve(undefined)
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
            LAST_SELECTED_WORKSPACE_IN_AGENT_SEARCH_STATE_KEY,
            selected_root
          )
        }

        const agent_info = available_agents.find(
          (a) => a.cmd == selected_agent_cmd
        )
        if (!agent_info) break

        const executable = agent_info.cmd
        const base_args = agent_info.get_args(query)

        const custom_args: string[] = []
        if (flags_string.trim()) {
          const regex = /([^\s'"]+)|"([^"]*)"|'([^']*)'/g
          let match
          while ((match = regex.exec(flags_string)) !== null) {
            custom_args.push(match[1] || match[2] || match[3])
          }
        }

        const args = [...base_args, ...custom_args]

        let agent_output = ''
        let raw_stream_output = ''
        let is_cancelled = false
        const start_time = Date.now()

        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: t('feature.search-files.title.agent'),
              cancellable: true
            },
            async (progress, token) => {
              progress.report({
                message: t('feature.search-files.agent.waiting-for-agent')
              })

              return new Promise<void>((resolve, reject) => {
                const child = spawn(executable, args, {
                  cwd: selected_root,
                  shell: false, // Prevents syntax breakage and command injection from newlines/quotes
                  stdio: ['ignore', 'pipe', 'pipe']
                })

                child.stdout.on('data', (data) => {
                  const chunk = data.toString()
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

                child.stderr.on('data', () => {
                  // Ignore stderr
                })

                token.onCancellationRequested(() => {
                  is_cancelled = true
                  child.kill()
                  resolve()
                })

                child.on('close', () => {
                  if (
                    agent_info.parse_final_output &&
                    raw_stream_output.trim()
                  ) {
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
                    function_name: 'perform_agent_search_mode',
                    message: "Agent's response",
                    data: agent_output
                  })
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
          go_back_to_query = true
          break
        }

        if (is_cancelled) {
          go_back_to_query = true
          break
        }

        const duration = format_duration(Date.now() - start_time)
        vscode.window.showInformationMessage(
          t('feature.search-files.agent.finished', { duration })
        )

        if (agent_output.trim() == '') {
          vscode.window.showInformationMessage(
            t('feature.search-files.no-files')
          )
          go_back_to_query = true
          break
        }

        const all_workspace_files = await get_all_workspace_files({
          workspace_provider: params.workspace_provider
        })

        let workspace_files = all_workspace_files

        if (roots.length > 1 && selected_root) {
          const workspace_name =
            params.workspace_provider.get_workspace_name(selected_root)
          const prefix = `${workspace_name}/`
          const root_files = workspace_files.filter((f) => f.startsWith(prefix))
          workspace_files = root_files.map((f) => f.substring(prefix.length))
        }

        const valid_paths = extract_paths_from_bullet_list({
          text: agent_output,
          workspace_files
        })

        const absolute_paths = Array.from(
          new Set(
            valid_paths.map((p) => path.join(selected_root!, p))
          )
        ).filter((p) => fs.existsSync(p))

        if (absolute_paths.length === 0) {
          vscode.window.showInformationMessage(
            t('feature.search-files.no-files')
          )
          go_back_to_query = true
          break
        }

        let should_go_back_to_workspace = false
        let restored_selected_paths: string[] | undefined = undefined
        let restored_unmatched_paths: string[] | undefined = undefined
        let final_decision:
          | { selected_paths: string[]; matched_paths: string[]; title: string }
          | undefined

        while (true) {
          const currently_checked =
            params.workspace_provider.get_checked_files()
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
            should_go_back_to_workspace = true
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

        if (should_go_back_to_workspace) {
          if (roots.length > 1) {
            continue
          } else {
            go_back_to_agent = true
            break
          }
        }

        if (final_decision) {
          return final_decision
        }
      }

      if (go_back_to_query) {
        break
      }

      if (go_back_to_agent) {
        continue
      }
      break
    }

    if (go_back_to_query) {
      continue
    }

    break
  }

  return undefined
}
