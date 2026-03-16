import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { make_api_request } from '../utils/make-api-request'
import {
  find_relevant_files_instructions,
  find_relevant_files_format
} from '../constants/instructions'
import { apply_reasoning_effort } from '../utils/apply-reasoning-effort'
import { build_user_content } from '../utils/build-user-content'
import { RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import { display_token_count } from '../utils/display-token-count'
import {
  LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY,
  LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY
} from '../constants/state-keys'
import { shrink_file } from '../context/utils/shrink-file/shrink-file'
import { t } from '@/i18n'

export const find_relevant_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.findRelevantFiles',
    async (item?: any) => {
      let folder_path = item?.resourceUri?.fsPath

      if (folder_path) {
        try {
          const stats = await fs.promises.stat(folder_path)
          if (!stats.isDirectory()) {
            folder_path = path.dirname(folder_path)
          }
        } catch (error) {
          folder_path = undefined
        }
      }

      if (!folder_path) {
        vscode.window.showErrorMessage(
          t('command.find-relevant-files.error.no-folder-selected')
        )
        return
      }

      let initial_instructions =
        extension_context.workspaceState.get<string>(
          LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY
        ) || ''

      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }

      while (true) {
        const input_box = vscode.window.createInputBox()
        input_box.title = t('command.find-relevant-files.input.title')
        input_box.prompt = t('command.find-relevant-files.input.prompt')
        input_box.placeholder = t(
          'command.find-relevant-files.input.placeholder'
        )
        input_box.value = initial_instructions
        input_box.buttons = [close_button]

        const instructions = await new Promise<string | undefined>(
          (resolve) => {
            let is_resolved = false
            const disposables: vscode.Disposable[] = []

            disposables.push(
              input_box.onDidTriggerButton((button) => {
                if (button === close_button) {
                  resolve(undefined)
                  input_box.hide()
                }
              }),
              input_box.onDidAccept(() => {
                is_resolved = true
                resolve(input_box.value)
                input_box.hide()
              }),
              input_box.onDidHide(() => {
                if (!is_resolved) {
                  resolve(undefined)
                }
                disposables.forEach((d) => d.dispose())
                input_box.dispose()
              })
            )
            input_box.show()
          }
        )

        if (!instructions) {
          return
        }

        await extension_context.workspaceState.update(
          LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY,
          instructions
        )
        initial_instructions = instructions

        const should_shrink = extension_context.workspaceState.get<boolean>(
          LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
          false
        )

        const all_files = await workspace_provider.find_all_files(folder_path)
        const workspace_root =
          workspace_provider.get_workspace_root_for_file(folder_path) ||
          folder_path

        let full_tokens = 0
        let full_content_length = 0
        let shrunk_content_length = 0

        const files_data: {
          file_path: string
          relative_path: string
          content: string
          shrunk_content: string
        }[] = []

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Window,
            title: t('command.find-relevant-files.progress.analyzing')
          },
          async () => {
            for (const file_path of all_files) {
              try {
                const stats = await fs.promises.stat(file_path)
                if (stats.size > 1024 * 1024) continue

                const content = await fs.promises.readFile(file_path, 'utf8')
                const shrunk_content = shrink_file(
                  content,
                  path.extname(file_path)
                )
                const relative_path = path.relative(workspace_root, file_path)

                files_data.push({
                  file_path,
                  relative_path,
                  content,
                  shrunk_content
                })

                full_content_length += content.length
                shrunk_content_length += shrunk_content.length

                const token_count =
                  await workspace_provider.calculate_file_tokens(file_path)
                full_tokens += token_count.total
              } catch (e) {}
            }
          }
        )

        const shrink_tokens =
          full_content_length > 0
            ? Math.floor(
                full_tokens * (shrunk_content_length / full_content_length)
              )
            : 0

        let go_back_to_input = false
        while (true) {
          const shrink_items: vscode.QuickPickItem[] = [
            {
              label: t('command.find-relevant-files.shrink.full'),
              description: `${display_token_count(full_tokens)} tokens`
            },
            {
              label: t('command.find-relevant-files.shrink.strip'),
              description: `${display_token_count(shrink_tokens)} tokens`
            }
          ]

          const shrink_quick_pick = vscode.window.createQuickPick()
          shrink_quick_pick.items = shrink_items
          shrink_quick_pick.title = t('command.find-relevant-files.input.title')
          shrink_quick_pick.placeholder = t(
            'command.find-relevant-files.shrink.placeholder'
          )
          shrink_quick_pick.activeItems = [
            should_shrink ? shrink_items[1] : shrink_items[0]
          ]
          shrink_quick_pick.buttons = [vscode.QuickInputButtons.Back]

          const shrink_result = await new Promise<boolean | 'back' | undefined>(
            (resolve) => {
              let is_resolved = false
              shrink_quick_pick.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  is_resolved = true
                  resolve('back')
                  shrink_quick_pick.hide()
                }
              })
              shrink_quick_pick.onDidAccept(() => {
                is_resolved = true
                resolve(
                  shrink_quick_pick.selectedItems[0].label ==
                    t('command.find-relevant-files.shrink.strip')
                )
                shrink_quick_pick.hide()
              })
              shrink_quick_pick.onDidHide(() => {
                if (!is_resolved) {
                  resolve('back')
                }
                shrink_quick_pick.dispose()
              })
              shrink_quick_pick.show()
            }
          )

          if (shrink_result == 'back') {
            go_back_to_input = true
            break
          }

          if (shrink_result === undefined) {
            return
          }

          await extension_context.workspaceState.update(
            LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
            shrink_result
          )

          const api_providers_manager = new ModelProvidersManager(
            extension_context
          )
          const configs =
            await api_providers_manager.get_find_relevant_files_tool_configs()

          if (configs.length === 0) {
            vscode.commands.executeCommand('codeWebChat.settings')
            vscode.window.showInformationMessage(
              t('command.find-relevant-files.error.no-configs')
            )
            return
          }

          let go_back_to_shrink = false
          while (true) {
            let selected_config: any = undefined
            let skipped_config = false
            const default_config =
              await api_providers_manager.get_default_find_relevant_files_config()

            if (default_config) {
              selected_config = default_config
              skipped_config = true
            } else if (configs.length === 1) {
              selected_config = configs[0]
              skipped_config = true
            } else {
              const create_items = () => {
                const recent_ids =
                  extension_context.workspaceState.get<string[]>(
                    RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
                  ) || []

                const matched_recent_configs: any[] = []
                const remaining_configs: any[] = []

                configs.forEach((config: any) => {
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

                const map_config_to_item = (config: any) => {
                  const description_parts = [config.provider_name]
                  if (config.temperature != null) {
                    description_parts.push(`${config.temperature}`)
                  }
                  if (config.reasoning_effort) {
                    description_parts.push(`${config.reasoning_effort}`)
                  }

                  return {
                    label: config.model,
                    description: description_parts.join(' · '),
                    config,
                    id: get_tool_config_id(config)
                  }
                }

                const items: (vscode.QuickPickItem & {
                  config?: any
                  id?: string
                })[] = []

                if (matched_recent_configs.length > 0) {
                  items.push({
                    label: t('common.separator.recently-used'),
                    kind: vscode.QuickPickItemKind.Separator
                  })
                  items.push(...matched_recent_configs.map(map_config_to_item))
                }

                if (remaining_configs.length > 0) {
                  if (matched_recent_configs.length > 0) {
                    items.push({
                      label: t('common.config.other'),
                      kind: vscode.QuickPickItemKind.Separator
                    })
                  }
                  items.push(...remaining_configs.map(map_config_to_item))
                }

                return items
              }

              const config_quick_pick = vscode.window.createQuickPick()
              config_quick_pick.items = create_items()
              config_quick_pick.title = t('common.config.title')

              const tokens_to_process = shrink_result
                ? shrink_tokens
                : full_tokens
              config_quick_pick.placeholder = t(
                'common.config.placeholder-with-tokens',
                {
                  tokens: display_token_count(tokens_to_process)
                }
              )
              config_quick_pick.matchOnDescription = true
              config_quick_pick.buttons = [vscode.QuickInputButtons.Back]

              const items = config_quick_pick.items as (vscode.QuickPickItem & {
                id?: string
              })[]
              const first_selectable = items.find(
                (i) => i.kind !== vscode.QuickPickItemKind.Separator
              )
              if (first_selectable) {
                config_quick_pick.activeItems = [first_selectable]
              }

              const config_result = await new Promise<any | 'back' | undefined>(
                (resolve) => {
                  let is_resolved = false
                  config_quick_pick.onDidTriggerButton((button) => {
                    if (button === vscode.QuickInputButtons.Back) {
                      is_resolved = true
                      resolve('back')
                      config_quick_pick.hide()
                    }
                  })

                  config_quick_pick.onDidAccept(() => {
                    is_resolved = true
                    const selected = config_quick_pick.selectedItems[0] as any
                    if (selected && selected.config) {
                      resolve(selected.config)
                    } else {
                      resolve(undefined)
                    }
                    config_quick_pick.hide()
                  })

                  config_quick_pick.onDidHide(() => {
                    if (!is_resolved) {
                      resolve('back')
                    }
                    config_quick_pick.dispose()
                  })

                  config_quick_pick.show()
                }
              )

              if (config_result === 'back') {
                go_back_to_shrink = true
                break
              }

              if (!config_result) {
                return
              }

              selected_config = config_result
            }

            if (selected_config) {
              const selected_id = get_tool_config_id(selected_config)
              const recents =
                extension_context.workspaceState.get<string[]>(
                  RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
                ) || []
              const updated_recents = [
                selected_id,
                ...recents.filter((id) => id !== selected_id)
              ]
              await extension_context.workspaceState.update(
                RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY,
                updated_recents
              )
            }

            const provider = await api_providers_manager.get_provider(
              selected_config.provider_name
            )
            if (!provider) {
              vscode.window.showErrorMessage(
                t('command.find-relevant-files.error.provider-not-found')
              )
              return
            }

            let xml_files = `<files>\n`
            for (const file of files_data) {
              const content_to_use = shrink_result
                ? file.shrunk_content
                : file.content
              xml_files += `<file path="${file.relative_path}">\n<![CDATA[\n${content_to_use}\n]]>\n</file>\n`
            }
            xml_files += `</files>`

            const config_settings =
              vscode.workspace.getConfiguration('codeWebChat')
            const config_find_relevant_files_instructions =
              config_settings.get<string>('findRelevantFilesInstructions')
            const instructions_to_use =
              config_find_relevant_files_instructions ||
              find_relevant_files_instructions

            const system_instructions_xml = `${find_relevant_files_format}\n${instructions_to_use}`
            const part2 = `${system_instructions_xml}\nTask:\n${instructions}`

            const user_content = build_user_content({
              provider_name: provider.name,
              part1: xml_files,
              part2,
              disable_cache: true
            })

            const messages = [
              {
                role: 'user',
                content: user_content
              }
            ]

            const body: { [key: string]: any } = {
              messages,
              model: selected_config.model,
              temperature: selected_config.temperature
            }

            apply_reasoning_effort({
              body,
              provider,
              reasoning_effort: selected_config.reasoning_effort
            })

            const cancel_token_source = axios.CancelToken.source()

            try {
              const completion_result = await vscode.window.withProgress(
                {
                  location: vscode.ProgressLocation.Notification,
                  title: t('command.find-relevant-files.progress.finding'),
                  cancellable: true
                },
                async (progress, token) => {
                  token.onCancellationRequested(() => {
                    cancel_token_source.cancel(
                      t('command.find-relevant-files.cancel.user')
                    )
                  })

                  progress.report({
                    message: t('common.progress.waiting-for-server')
                  })

                  return await make_api_request({
                    endpoint_url: provider.base_url,
                    api_key: provider.api_key,
                    body,
                    cancellation_token: cancel_token_source.token,
                    on_chunk: () => {
                      progress.report({
                        message: t('common.progress.receiving')
                      })
                    },
                    on_thinking_chunk: () => {
                      progress.report({
                        message: t('common.progress.thinking')
                      })
                    }
                  })
                }
              )

              if (completion_result) {
                const match = completion_result.response.match(
                  /<relevant-files>([\s\S]*?)<\/relevant-files>/
                )
                const extracted_files: string[] = []
                if (match && match[1]) {
                  const file_matches = match[1].matchAll(
                    /<file-path>(.*?)<\/file-path>/g
                  )
                  for (const m of file_matches) {
                    extracted_files.push(m[1].trim())
                  }
                }

                if (extracted_files.length == 0) {
                  vscode.window.showWarningMessage(
                    t('command.find-relevant-files.error.no-files-found')
                  )
                  go_back_to_input = true
                  break
                }

                const currently_checked = workspace_provider.get_checked_files()
                const absolute_paths: string[] = []

                for (const rel_path of extracted_files) {
                  const potential_abs = path.join(workspace_root, rel_path)
                  if (fs.existsSync(potential_abs)) {
                    absolute_paths.push(potential_abs)
                  }
                }

                const open_file_button = {
                  iconPath: new vscode.ThemeIcon('go-to-file'),
                  tooltip: t('common.go-to-file')
                }

                const quick_pick_items = await Promise.all(
                  absolute_paths.map(async (file_path) => {
                    const relative_path = path.relative(
                      workspace_root,
                      file_path
                    )
                    const dir_name = path.dirname(relative_path)
                    const display_dir = dir_name === '.' ? '' : dir_name

                    const token_count =
                      await workspace_provider.calculate_file_tokens(file_path)
                    const formatted_token_count = display_token_count(
                      token_count.total
                    )

                    return {
                      label: path.basename(file_path),
                      description: display_dir
                        ? `${formatted_token_count} · ${display_dir}`
                        : formatted_token_count,
                      file_path,
                      buttons: [open_file_button]
                    }
                  })
                )

                const quick_pick = vscode.window.createQuickPick<
                  vscode.QuickPickItem & { file_path: string }
                >()
                quick_pick.items = quick_pick_items
                quick_pick.selectedItems = quick_pick_items.filter((item) =>
                  currently_checked.includes(item.file_path)
                )
                quick_pick.canSelectMany = true
                quick_pick.title = t(
                  'command.find-relevant-files.quick-pick.title'
                )
                quick_pick.placeholder = t(
                  'command.find-relevant-files.quick-pick.placeholder'
                )
                quick_pick.ignoreFocusOut = true

                quick_pick.buttons = [
                  vscode.QuickInputButtons.Back,
                  close_button
                ]

                const selected = await new Promise<
                  | readonly (vscode.QuickPickItem & { file_path: string })[]
                  | undefined
                  | 'back'
                >((resolve) => {
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
                    is_resolved = true
                    resolve(quick_pick.selectedItems)
                    quick_pick.hide()
                  })

                  quick_pick.onDidTriggerItemButton(async (e) => {
                    if (e.button === open_file_button) {
                      try {
                        const doc = await vscode.workspace.openTextDocument(
                          e.item.file_path
                        )
                        await vscode.window.showTextDocument(doc, {
                          preview: true
                        })
                      } catch (error) {
                        vscode.window.showErrorMessage(
                          t('command.find-relevant-files.error.opening-file', {
                            error: String(error)
                          })
                        )
                      }
                    }
                  })

                  quick_pick.onDidHide(() => {
                    if (!is_resolved) {
                      resolve('back')
                    }
                    quick_pick.dispose()
                  })
                  quick_pick.show()
                })

                if (selected === 'back') {
                  if (skipped_config) {
                    go_back_to_shrink = true
                    break
                  } else {
                    continue
                  }
                }

                if (!selected) {
                  return
                }

                if (selected) {
                  const selected_paths = selected.map((item) => item.file_path)
                  const unchecked_paths = absolute_paths.filter(
                    (file_path) => !selected_paths.includes(file_path)
                  )

                  const paths_to_apply = [
                    ...new Set([
                      ...currently_checked.filter(
                        (p) => !unchecked_paths.includes(p)
                      ),
                      ...selected_paths
                    ])
                  ]
                  await workspace_provider.set_checked_files(paths_to_apply)

                  const newly_selected_count = selected_paths.filter(
                    (p) => !currently_checked.includes(p)
                  ).length

                  vscode.window.showInformationMessage(
                    t('command.find-relevant-files.success.added', {
                      count: newly_selected_count
                    })
                  )
                  return
                }
              }
            } catch (error) {
              if (!axios.isCancel(error)) {
                Logger.error({
                  function_name: 'find_relevant_files_command',
                  message: 'Error finding relevant files',
                  data: error
                })
                vscode.window.showErrorMessage(
                  t('command.find-relevant-files.error.finding')
                )
              }
              return
            }
          } // end config while
          if (go_back_to_shrink) continue
          if (go_back_to_input) break
        } // end shrink while
        if (go_back_to_input) continue
      }
    }
  )
}
