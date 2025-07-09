import * as vscode from 'vscode'
import * as fs from 'fs'
import { parse_response, ClipboardFile } from './utils/clipboard-parser'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../../constants/state-keys'
import { Logger } from '../../utils/logger'
import { OriginalFileState } from '../../types/common'
import { revert_files } from './utils/file-operations'
import { handle_fast_replace } from './handlers/fast-replace-handler'
import { handle_intelligent_update } from './handlers/intelligent-update-handler'
import { create_safe_path } from '@/utils/path-sanitizer'
import { check_for_truncated_fragments } from '@/utils/check-for-truncated-fragments'
import { ApiProvidersManager } from '@/services/api-providers-manager'
import { apply_git_patch } from './utils/patch-handler'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY } from '../../constants/state-keys'
import { DiffPatch } from './utils/clipboard-parser/extract-diff-patches'

async function check_if_all_files_new(
  files: ClipboardFile[]
): Promise<boolean> {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return false
  }

  // Create a map of workspace names to their root paths
  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  // Default workspace is the first one
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  for (const file of files) {
    // Determine the correct workspace root for this file
    let workspace_root = default_workspace
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    }

    // Create safe path using the correct workspace root
    const safe_path = create_safe_path(workspace_root, file.file_path)

    if (safe_path && fs.existsSync(safe_path)) {
      return false // At least one file exists
    }
  }

  return true // All files are new
}

async function get_intelligent_update_config(
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ provider: any; config: any } | undefined> {
  const intelligent_update_configs =
    await api_providers_manager.get_intelligent_update_tool_configs()

  if (intelligent_update_configs.length === 0) {
    vscode.window.showErrorMessage(
      'Intelligent Update API tool is not configured. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_intelligent_update_config',
      message: 'Intelligent Update API tool is not configured.'
    })
    return
  }

  let selected_config = null

  if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_intelligent_update_config()
  }

  if (!selected_config || show_quick_pick) {
    const move_up_button = {
      iconPath: new vscode.ThemeIcon('chevron-up'),
      tooltip: 'Move up'
    }

    const move_down_button = {
      iconPath: new vscode.ThemeIcon('chevron-down'),
      tooltip: 'Move down'
    }

    const set_default_button = {
      iconPath: new vscode.ThemeIcon('star'),
      tooltip: 'Set as default'
    }

    const unset_default_button = {
      iconPath: new vscode.ThemeIcon('star-full'),
      tooltip: 'Unset default'
    }

    const create_items = async () => {
      const default_config =
        await api_providers_manager.get_default_intelligent_update_config()

      return intelligent_update_configs.map((config, index) => {
        const buttons = []

        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model

        if (intelligent_update_configs.length > 1) {
          if (index > 0) {
            buttons.push(move_up_button)
          }

          if (index < intelligent_update_configs.length - 1) {
            buttons.push(move_down_button)
          }
        }

        if (is_default) {
          buttons.push(unset_default_button)
        } else {
          buttons.push(set_default_button)
        }

        return {
          label: config.model,
          description: `${
            config.reasoning_effort ? `${config.reasoning_effort}` : ''
          }${
            config.reasoning_effort
              ? ` · ${config.provider_name}`
              : `${config.provider_name}`
          }`,
          config,
          index,
          buttons
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select intelligent update configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
      LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY,
      0
    )

    if (last_selected_index >= 0 && last_selected_index < items.length) {
      quick_pick.activeItems = [items[last_selected_index]]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any
          const button = event.button
          const index = item.index

          if (button === set_default_button) {
            await api_providers_manager.set_default_intelligent_update_config(
              intelligent_update_configs[index]
            )
            quick_pick.items = await create_items()
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_intelligent_update_config(
              null as any
            )
            quick_pick.items = await create_items()
          } else if (button.tooltip == 'Move up' && index > 0) {
            const temp = intelligent_update_configs[index]
            intelligent_update_configs[index] =
              intelligent_update_configs[index - 1]
            intelligent_update_configs[index - 1] = temp

            await api_providers_manager.save_intelligent_update_tool_configs(
              intelligent_update_configs
            )

            quick_pick.items = await create_items()
          } else if (
            button.tooltip == 'Move down' &&
            index < intelligent_update_configs.length - 1
          ) {
            const temp = intelligent_update_configs[index]
            intelligent_update_configs[index] =
              intelligent_update_configs[index + 1]
            intelligent_update_configs[index + 1] = temp

            await api_providers_manager.save_intelligent_update_tool_configs(
              intelligent_update_configs
            )

            quick_pick.items = await create_items()
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected) {
            resolve(undefined)
            return
          }

          context.globalState.update(
            LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY,
            selected.index
          )

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              'API provider not found for Intelligent Update tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
            )
            Logger.warn({
              function_name: 'get_intelligent_update_config',
              message: 'API provider not found for Intelligent Update tool.'
            })
            resolve(undefined)
            return
          }

          resolve({
            provider,
            config: selected.config
          })
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          resolve(undefined)
        })

        quick_pick.show()
      }
    )
  }

  const provider = await api_providers_manager.get_provider(
    selected_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      'API provider not found for Intelligent Update tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_intelligent_update_config',
      message: 'API provider not found for Intelligent Update tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

async function handle_code_completion(completion: {
  file_path: string
  content: string
  line: number
  character: number
  workspace_name?: string
}): Promise<void> {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage('No workspace folder open.')
    return
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath
  let workspace_root = default_workspace
  if (
    completion.workspace_name &&
    workspace_map.has(completion.workspace_name)
  ) {
    workspace_root = workspace_map.get(completion.workspace_name)!
  }

  const safe_path = create_safe_path(workspace_root, completion.file_path)

  if (!safe_path || !fs.existsSync(safe_path)) {
    vscode.window.showErrorMessage(`File not found: ${completion.file_path}`)
    Logger.warn({
      function_name: 'handle_code_completion',
      message: 'File not found for code completion.',
      data: { file_path: completion.file_path, safe_path }
    })
    return
  }

  try {
    const document = await vscode.workspace.openTextDocument(safe_path)
    const editor = await vscode.window.showTextDocument(document, {
      preview: false
    })

    // VSCode position is 0-based, so we subtract 1
    const line_index = completion.line - 1
    const char_index = completion.character - 1

    if (line_index < 0 || char_index < 0) {
      vscode.window.showErrorMessage(
        `Invalid position: ${completion.line}:${completion.character}. Position cannot be negative.`
      )
      return
    }

    if (line_index >= document.lineCount) {
      vscode.window.showErrorMessage(
        `Invalid line number ${completion.line}. File has only ${document.lineCount} lines.`
      )
      return
    }

    const line_text = document.lineAt(line_index).text
    if (char_index > line_text.length) {
      vscode.window.showErrorMessage(
        `Invalid character position ${completion.character} on line ${completion.line}. Line has only ${line_text.length} characters.`
      )
      return
    }

    const position = new vscode.Position(line_index, char_index)

    await editor.edit((editBuilder) => {
      editBuilder.insert(position, completion.content)
    })
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message)
  }
}
export function apply_chat_response_command(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand(
    'codeWebChat.applyChatResponse',
    async (args?: { response?: string }) => {
      let chat_response = args?.response

      if (!chat_response) {
        chat_response = await vscode.env.clipboard.readText()
      }

      if (!chat_response) {
        vscode.window.showErrorMessage(
          'No response text provided and clipboard is empty.'
        )
        Logger.warn({
          function_name: 'apply_chat_response_command',
          message: 'Clipboard is empty.'
        })
        return
      }

      // Check if workspace has only one root folder
      const is_single_root_folder_workspace =
        vscode.workspace.workspaceFolders?.length == 1

      // Parse clipboard content which can now contain either files or patches
      const clipboard_content = parse_response(
        chat_response,
        is_single_root_folder_workspace
      )

      if (
        clipboard_content.type == 'code-completion' &&
        clipboard_content.code_completion
      ) {
        await handle_code_completion(clipboard_content.code_completion)
        return
      }

      // Handle patches if found
      if (clipboard_content.type == 'patches' && clipboard_content.patches) {
        if (!vscode.workspace.workspaceFolders?.length) {
          vscode.window.showErrorMessage('No workspace folder open.')
          return
        }

        // Create a map of workspace names to their root paths
        const workspace_map = new Map<string, string>()
        vscode.workspace.workspaceFolders.forEach((folder) => {
          workspace_map.set(folder.name, folder.uri.fsPath)
        })

        const default_workspace =
          vscode.workspace.workspaceFolders[0].uri.fsPath
        let success_count = 0
        let failure_count = 0
        let all_original_states: OriginalFileState[] = []
        const failed_patches: DiffPatch[] = []
        let any_patch_used_fallback = false
        const applied_patches: {
          patch: DiffPatch
          original_states: OriginalFileState[]
          used_fallback: boolean
        }[] = []

        // Process patches
        const total_patches = clipboard_content.patches.length

        for (let i = 0; i < total_patches; i++) {
          const patch = clipboard_content.patches[i]
          let workspace_path = default_workspace

          if (patch.workspace_name && workspace_map.has(patch.workspace_name)) {
            workspace_path = workspace_map.get(patch.workspace_name)!
          }

          const result = await apply_git_patch(patch.content, workspace_path)

          if (result.success) {
            success_count++
            if (result.original_states) {
              all_original_states = all_original_states.concat(
                result.original_states
              )
              applied_patches.push({
                patch,
                original_states: result.original_states,
                used_fallback: !!result.used_fallback
              })
            }
            if (result.used_fallback) {
              any_patch_used_fallback = true
            }
          } else {
            failure_count++
            failed_patches.push(patch)
          }
        }

        // Store all original states for potential reversion
        if (all_original_states.length > 0) {
          context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            all_original_states
          )
        }

        // Handle results
        if (failure_count > 0) {
          const api_providers_manager = new ApiProvidersManager(context)
          const config_result = await get_intelligent_update_config(
            api_providers_manager,
            false,
            context
          )

          if (!config_result) {
            // If we can't get the config, revert successful patches to maintain consistency
            if (success_count > 0 && all_original_states.length > 0) {
              await revert_files(all_original_states)
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                null
              )
            }
            return
          }

          const { provider, config: intelligent_update_config } = config_result

          let endpoint_url = ''
          if (provider.type == 'built-in') {
            const provider_info =
              PROVIDERS[provider.name as keyof typeof PROVIDERS]
            endpoint_url = provider_info.base_url
          } else {
            endpoint_url = provider.base_url
          }

          const failed_patches_as_code_blocks = failed_patches
            .map(
              (patch) =>
                `\`\`\`\n// ${patch.file_path}\n${patch.content}\n\`\`\``
            )
            .join('\n')

          try {
            const intelligent_update_states = await handle_intelligent_update({
              endpoint_url,
              api_key: provider.api_key,
              config: intelligent_update_config,
              chat_response: failed_patches_as_code_blocks,
              context: context,
              is_single_root_folder_workspace
            })

            if (intelligent_update_states) {
              const combined_states = [
                ...all_original_states,
                ...intelligent_update_states
              ]
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                combined_states
              )
              const response = await vscode.window.showInformationMessage(
                `Successfully applied ${failed_patches.length} failed patch${
                  failed_patches.length != 1 ? 'es' : ''
                } using intelligent update.`,
                'Revert'
              )

              if (response == 'Revert') {
                await revert_files(combined_states)
                context.workspaceState.update(
                  LAST_APPLIED_CHANGES_STATE_KEY,
                  null
                )
              }
            } else {
              // Intelligent update failed or was canceled - revert successful patches
              if (success_count > 0 && all_original_states.length > 0) {
                await revert_files(all_original_states)
                context.workspaceState.update(
                  LAST_APPLIED_CHANGES_STATE_KEY,
                  null
                )
              }
            }
          } catch (error) {
            // Handle any errors during intelligent update
            Logger.error({
              function_name: 'apply_chat_response_command',
              message: 'Error during intelligent update of failed patches'
            })

            const response = await vscode.window.showErrorMessage(
              'Error during fix attempt with the intelligent update tool. Would you like to revert the successfully applied patches?',
              'Keep changes',
              'Revert'
            )

            if (response == 'Revert' && all_original_states.length > 0) {
              await revert_files(all_original_states)
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                null
              )
            }
          }
        } else if (success_count > 0) {
          // All patches applied successfully - show "Looks off" only if any used fallback
          const buttons = ['Revert']
          if (any_patch_used_fallback) {
            buttons.push('Looks off, use intelligent update')
          }

          const response = await vscode.window.showInformationMessage(
            `Successfully applied ${success_count} patch${
              success_count != 1 ? 'es' : ''
            }.`,
            ...buttons
          )

          if (response == 'Revert' && all_original_states.length > 0) {
            await revert_files(all_original_states)
            context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
          } else if (response == 'Looks off, use intelligent update') {
            const fallback_patches_info = applied_patches.filter(
              (p) => p.used_fallback
            )
            const good_patches_info = applied_patches.filter(
              (p) => !p.used_fallback
            )

            const fallback_patches = fallback_patches_info.map((p) => p.patch)
            const fallback_states = fallback_patches_info.flatMap(
              (p) => p.original_states
            )
            const good_states = good_patches_info.flatMap(
              (p) => p.original_states
            )

            // Revert only the patches that used fallback, without showing a message
            await revert_files(fallback_states, false)

            // Then try with intelligent update
            const api_providers_manager = new ApiProvidersManager(context)
            const config_result = await get_intelligent_update_config(
              api_providers_manager,
              false,
              context
            )

            if (!config_result) {
              // Config was cancelled. The fallback patches are reverted.
              // The state should now be just the good patches.
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                good_states.length > 0 ? good_states : null
              )
              return
            }

            const { provider, config: intelligent_update_config } =
              config_result

            // Convert only fallback patches to clipboard format
            const fallback_patches_text = fallback_patches
              .map(
                (patch) =>
                  `\`\`\`\n// ${patch.file_path}\n${patch.content}\n\`\`\``
              )
              .join('\n')

            let endpoint_url = ''
            if (provider.type === 'built-in') {
              const provider_info =
                PROVIDERS[provider.name as keyof typeof PROVIDERS]
              endpoint_url = provider_info.base_url
            } else {
              endpoint_url = provider.base_url
            }

            try {
              const intelligent_update_states = await handle_intelligent_update(
                {
                  endpoint_url,
                  api_key: provider.api_key,
                  config: intelligent_update_config,
                  chat_response: fallback_patches_text,
                  context: context,
                  is_single_root_folder_workspace
                }
              )

              if (intelligent_update_states) {
                const combined_states = [
                  ...good_states,
                  ...intelligent_update_states
                ]
                context.workspaceState.update(
                  LAST_APPLIED_CHANGES_STATE_KEY,
                  combined_states
                )
                const response = await vscode.window.showInformationMessage(
                  `Successfully applied patches using intelligent update.`,
                  'Revert'
                )

                if (response == 'Revert') {
                  await revert_files(combined_states)
                  context.workspaceState.update(
                    LAST_APPLIED_CHANGES_STATE_KEY,
                    null
                  )
                }
              } else {
                // Intelligent update was canceled.
                context.workspaceState.update(
                  LAST_APPLIED_CHANGES_STATE_KEY,
                  good_states.length > 0 ? good_states : null
                )
                vscode.window.showInformationMessage(
                  'Intelligent update was canceled. Fallback changes reverted; clean changes kept.'
                )
              }
            } catch (error) {
              Logger.error({
                function_name: 'apply_chat_response_command',
                message: 'Error during intelligent update of fallback patches'
              })
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                good_states.length > 0 ? good_states : null
              )
              vscode.window.showErrorMessage(
                'Error during intelligent update. Fallback changes reverted; clean changes kept.'
              )
            }
          }
        }

        return
      } else {
        if (!clipboard_content.files || clipboard_content.files.length == 0) {
          vscode.window.showErrorMessage(
            'Unable to find valid code blocks in the clipboard.'
          )
          return
        }

        // --- Mode Selection ---
        let selected_mode_label:
          | 'Fast replace'
          | 'Intelligent update'
          | undefined = undefined

        const all_files_new = await check_if_all_files_new(
          clipboard_content.files
        )

        if (all_files_new) {
          selected_mode_label = 'Fast replace'
          Logger.log({
            function_name: 'apply_chat_response_command',
            message:
              'All files are new - automatically selecting fast replace mode'
          })
        } else {
          const has_truncated_fragments = check_for_truncated_fragments(
            clipboard_content.files
          )

          if (has_truncated_fragments) {
            selected_mode_label = 'Intelligent update'
            Logger.log({
              function_name: 'apply_chat_response_command',
              message:
                'Auto-selecting intelligent update mode due to detected truncated fragments'
            })
          } else {
            selected_mode_label = 'Fast replace'
            Logger.log({
              function_name: 'apply_chat_response_command',
              message: 'Defaulting to Fast replace mode'
            })
          }
        }

        // --- Execute Mode Handler ---
        let final_original_states: OriginalFileState[] | null = null
        let operation_success = false

        if (selected_mode_label == 'Fast replace') {
          const result = await handle_fast_replace(clipboard_content.files)
          if (result.success && result.original_states) {
            final_original_states = result.original_states
            operation_success = true
          }
          Logger.log({
            function_name: 'apply_chat_response_command',
            message: 'Fast replace handler finished.',
            data: { success: result.success }
          })
        } else if (selected_mode_label == 'Intelligent update') {
          const api_providers_manager = new ApiProvidersManager(context)

          const config_result = await get_intelligent_update_config(
            api_providers_manager,
            false,
            context
          )

          if (!config_result) {
            return
          }

          const { provider, config: intelligent_update_config } = config_result

          let endpoint_url = ''
          if (provider.type == 'built-in') {
            const provider_info =
              PROVIDERS[provider.name as keyof typeof PROVIDERS]
            endpoint_url = provider_info.base_url
          } else {
            endpoint_url = provider.base_url
          }

          final_original_states = await handle_intelligent_update({
            endpoint_url,
            api_key: provider.api_key,
            config: intelligent_update_config,
            chat_response,
            context: context,
            is_single_root_folder_workspace
          })

          if (final_original_states) {
            operation_success = true
          }
          Logger.log({
            function_name: 'apply_chat_response_command',
            message: 'Intelligent update handler finished.',
            data: { success: operation_success }
          })
        } else {
          Logger.error({
            function_name: 'apply_chat_response_command',
            message: 'No valid mode selected or determined.'
          })
          return
        }

        // --- Handle Results ---
        if (operation_success && final_original_states) {
          context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            final_original_states
          )

          // Check how many files were actually new and how many were replaced
          const new_files_count = final_original_states.filter(
            (state) => state.is_new
          ).length
          const replaced_files_count =
            final_original_states.length - new_files_count

          const replaced_or_updated =
            selected_mode_label == 'Intelligent update' ? 'updated' : 'replaced'

          let message = ''
          if (new_files_count > 0 && replaced_files_count > 0) {
            message = `Successfully created ${new_files_count} new ${
              new_files_count == 1 ? 'file' : 'files'
            } and ${replaced_or_updated} ${replaced_files_count} ${
              replaced_files_count == 1 ? 'file' : 'files'
            }.`
          } else if (new_files_count > 0) {
            message = `Successfully created ${new_files_count} new ${
              new_files_count == 1 ? 'file' : 'files'
            }.`
          } else if (replaced_files_count > 0) {
            message = `Successfully ${replaced_or_updated} ${replaced_files_count} ${
              replaced_files_count == 1 ? 'file' : 'files'
            }.`
          } else {
            // Should not happen if operation_success is true and final_original_states is not empty
            message = `Operation completed successfully.`
          }

          if (selected_mode_label == 'Fast replace') {
            const buttons = ['Revert']
            if (replaced_files_count > 0) {
              buttons.push('Looks off, use intelligent update')
            }

            const response = await vscode.window.showInformationMessage(
              message,
              ...buttons
            )

            if (response == 'Revert') {
              await revert_files(final_original_states)
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                null
              )
            } else if (response == 'Looks off, use intelligent update') {
              // First revert the fast replace changes
              await revert_files(final_original_states)

              // Then trigger intelligent update
              const api_providers_manager = new ApiProvidersManager(context)
              const config_result = await get_intelligent_update_config(
                api_providers_manager,
                false,
                context
              )

              if (!config_result) {
                return
              }

              const { provider, config: intelligent_update_config } =
                config_result

              let endpoint_url = ''
              if (provider.type == 'built-in') {
                const provider_info =
                  PROVIDERS[provider.name as keyof typeof PROVIDERS]
                endpoint_url = provider_info.base_url
              } else {
                endpoint_url = provider.base_url
              }

              try {
                final_original_states = await handle_intelligent_update({
                  endpoint_url,
                  api_key: provider.api_key,
                  config: intelligent_update_config,
                  chat_response,
                  context: context,
                  is_single_root_folder_workspace
                })

                if (final_original_states) {
                  context.workspaceState.update(
                    LAST_APPLIED_CHANGES_STATE_KEY,
                    final_original_states
                  )
                  // Recalculate counts for the intelligent update result
                  const intelligent_new_files_count =
                    final_original_states.filter((state) => state.is_new).length
                  const intelligent_replaced_files_count =
                    final_original_states.length - intelligent_new_files_count

                  let intelligent_message = ''
                  if (
                    intelligent_new_files_count > 0 &&
                    intelligent_replaced_files_count > 0
                  ) {
                    intelligent_message = `Successfully created ${intelligent_new_files_count} new ${
                      intelligent_new_files_count == 1 ? 'file' : 'files'
                    } and updated ${intelligent_replaced_files_count} ${
                      intelligent_replaced_files_count == 1 ? 'file' : 'files'
                    } using Intelligent Update.`
                  } else if (intelligent_new_files_count > 0) {
                    intelligent_message = `Successfully created ${intelligent_new_files_count} new ${
                      intelligent_new_files_count == 1 ? 'file' : 'files'
                    } using Intelligent Update.`
                  } else if (intelligent_replaced_files_count > 0) {
                    intelligent_message = `Successfully updated ${intelligent_replaced_files_count} ${
                      intelligent_replaced_files_count == 1 ? 'file' : 'files'
                    } using Intelligent Update.`
                  } else {
                    intelligent_message = `Intelligent Update completed successfully.`
                  }

                  vscode.window
                    .showInformationMessage(intelligent_message, 'Revert')
                    .then((response) => {
                      if (response == 'Revert') {
                        revert_files(final_original_states!)
                        context.workspaceState.update(
                          LAST_APPLIED_CHANGES_STATE_KEY,
                          null
                        )
                      }
                    })
                } else {
                  // Intelligent update was canceled after reverting fast replace
                  vscode.window.showInformationMessage(
                    'Intelligent update was canceled. Fast replace changes have been reverted.'
                  )
                  // State is already cleared by the revert_files call above
                }
              } catch (error) {
                // Handle errors during the second intelligent update attempt
                Logger.error({
                  function_name: 'apply_chat_response_command',
                  message: 'Error during second intelligent update attempt'
                })
                vscode.window.showErrorMessage(
                  'Error during intelligent update. Fast replace changes have been reverted.'
                )
                // State is already cleared by the revert_files call above
              }
            }
          } else {
            // For intelligent update, show only Revert button
            const response = await vscode.window.showInformationMessage(
              message,
              'Revert'
            )

            if (response == 'Revert') {
              await revert_files(final_original_states)
              context.workspaceState.update(
                LAST_APPLIED_CHANGES_STATE_KEY,
                null
              )
            }
          }
        } else {
          // Handler already showed specific error messages or handled cancellation silently.
          // Clear any potentially partially stored state from a failed operation.
          context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
          Logger.log({
            function_name: 'apply_chat_response_command',
            message: 'Operation concluded without success.'
          })
        }

        Logger.log({
          function_name: 'apply_chat_response_command',
          message: 'end',
          data: {
            mode: selected_mode_label,
            success: operation_success
          }
        })
      }
    }
  )
}
