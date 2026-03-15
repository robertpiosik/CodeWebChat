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
        vscode.window.showErrorMessage('No folder selected.')
        return
      }

      let initial_instructions =
        extension_context.workspaceState.get<string>(
          LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY
        ) || ''

      while (true) {
        const instructions = await vscode.window.showInputBox({
          title: 'Find Relevant Files',
          prompt: 'Enter instructions to find relevant files',
          placeHolder: 'e.g., changing password',
          value: initial_instructions
        })

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
            title: 'Analyzing directory...'
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

        const shrink_items: vscode.QuickPickItem[] = [
          {
            label: 'Send files in full',
            description: `${display_token_count(full_tokens)} tokens`
          },
          {
            label: 'Strip function bodies and comments',
            description: `${display_token_count(shrink_tokens)} tokens`
          }
        ]

        const shrink_quick_pick = vscode.window.createQuickPick()
        shrink_quick_pick.items = shrink_items
        shrink_quick_pick.title = 'Find Relevant Files'
        shrink_quick_pick.placeholder = 'Decide whether files should be shrunk'
        shrink_quick_pick.activeItems = [
          should_shrink ? shrink_items[1] : shrink_items[0]
        ]
        shrink_quick_pick.buttons = [vscode.QuickInputButtons.Back]

        const shrink_result = await new Promise<boolean | 'back' | undefined>(
          (resolve) => {
            shrink_quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                resolve('back')
                shrink_quick_pick.hide()
              }
            })
            shrink_quick_pick.onDidAccept(() => {
              resolve(
                shrink_quick_pick.selectedItems[0].label ==
                  'Strip function bodies and comments'
              )
              shrink_quick_pick.hide()
            })
            shrink_quick_pick.onDidHide(() => {
              resolve(undefined)
              shrink_quick_pick.dispose()
            })
            shrink_quick_pick.show()
          }
        )

        if (shrink_result == 'back') {
          continue
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
            'No configurations found for Find Relevant Files.'
          )
          return
        }

        let selected_config = configs[0]

        const recents =
          extension_context.workspaceState.get<string[]>(
            RECENTLY_USED_FIND_RELEVANT_FILES_CONFIG_IDS_STATE_KEY
          ) || []
        const last_selected_id = recents[0]
        if (last_selected_id) {
          const found = configs.find(
            (c: any) => get_tool_config_id(c) === last_selected_id
          )
          if (found) {
            selected_config = found
          }
        }

        const provider = await api_providers_manager.get_provider(
          selected_config.provider_name
        )
        if (!provider) {
          vscode.window.showErrorMessage('API Provider not found.')
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

        const config_settings = vscode.workspace.getConfiguration('codeWebChat')
        const config_find_relevant_files_instructions =
          config_settings.get<string>('findRelevantFilesInstructions')
        const instructions_to_use =
          config_find_relevant_files_instructions ||
          find_relevant_files_instructions

        const system_instructions_xml = `${instructions_to_use}\n${find_relevant_files_format}`
        const part2 = `${system_instructions_xml}\n${instructions}`

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
              title: 'Finding relevant files...',
              cancellable: true
            },
            async (progress, token) => {
              token.onCancellationRequested(() => {
                cancel_token_source.cancel('User canceled')
              })

              progress.report({ message: 'Waiting for server...' })

              return await make_api_request({
                endpoint_url: provider.base_url,
                api_key: provider.api_key,
                body,
                cancellation_token: cancel_token_source.token,
                on_chunk: () => {
                  progress.report({ message: 'Receiving...' })
                },
                on_thinking_chunk: () => {
                  progress.report({ message: 'Thinking...' })
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

            if (extracted_files.length === 0) {
              vscode.window.showInformationMessage('No relevant files found.')
              return
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
              tooltip: 'Go to file'
            }

            const quick_pick_items = await Promise.all(
              absolute_paths.map(async (file_path) => {
                const relative_path = path.relative(workspace_root, file_path)
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
            quick_pick.title = 'Search Results'
            quick_pick.placeholder = 'Select files to add to context'
            quick_pick.ignoreFocusOut = true

            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: 'Close'
            }
            quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

            const selected = await new Promise<
              | readonly (vscode.QuickPickItem & { file_path: string })[]
              | undefined
              | 'back'
            >((resolve) => {
              quick_pick.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  resolve('back')
                  quick_pick.hide()
                } else if (button === close_button) {
                  resolve(undefined)
                  quick_pick.hide()
                }
              })

              quick_pick.onDidAccept(() => {
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
                      `Error opening file: ${String(error)}`
                    )
                  }
                }
              })

              quick_pick.onDidHide(() => {
                resolve(undefined)
                quick_pick.dispose()
              })
              quick_pick.show()
            })

            if (selected === 'back') {
              continue
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
                `Added ${newly_selected_count} file(s) to context.`
              )
              break
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
              'Error finding relevant files. Check console.'
            )
          }
          break
        }
      }
    }
  )
}
