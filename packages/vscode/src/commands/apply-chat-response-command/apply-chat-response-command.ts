import * as vscode from 'vscode'
import * as fs from 'fs'
import { parse_response, ClipboardFile } from './utils/clipboard-parser'
import {
  LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
} from '../../constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '../../types/common'
import { undo_files, apply_file_relocations } from './utils/file-operations'
import { handle_fast_replace } from './handlers/fast-replace-handler'
import { handle_intelligent_update } from './handlers/intelligent-update-handler'
import { create_safe_path } from '@/utils/path-sanitizer'
import { check_for_truncated_fragments } from '@/utils/check-for-truncated-fragments'
import { ApiProvidersManager } from '@/services/api-providers-manager'
import { apply_git_patch } from './handlers/patch-handler'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY } from '../../constants/state-keys'
import { DiffPatch } from './utils/clipboard-parser/extract-diff-patches'
import { ViewProvider } from '../../view/backend/view-provider'
import {
  review_applied_changes,
  code_review_promise_resolve
} from './utils/review-applied-changes'

let ongoing_review_cleanup_promise: Promise<void> | null = null

const check_if_all_files_new = async (
  files: ClipboardFile[]
): Promise<boolean> => {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return false
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  for (const file of files) {
    let workspace_root = default_workspace
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    }

    const safe_path = create_safe_path(workspace_root, file.file_path)

    if (safe_path && fs.existsSync(safe_path)) {
      return false
    }
  }

  return true
}

const get_intelligent_update_config = async (
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ provider: any; config: any } | undefined> => {
  const intelligent_update_configs =
    await api_providers_manager.get_intelligent_update_tool_configs()

  if (intelligent_update_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings.intelligentUpdate')
    vscode.window.showInformationMessage(
      'No "Intelligent Update" configurations found. Please add one in the settings.'
    )
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
              'API provider for the selected API tool configuration was not found.'
            )
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
      'API provider for the selected API tool configuration was not found.'
    )
    Logger.warn({
      function_name: 'get_intelligent_update_config',
      message: 'API provider not found for Intelligent Update API tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

const handle_code_review_and_cleanup = async (params: {
  original_states: OriginalFileState[]
  chat_response: string
  view_provider: ViewProvider
  update_undo_and_apply_button_state: (
    states: OriginalFileState[] | null,
    content?: string | null,
    original_editor_state?: {
      file_path: string
      position: { line: number; character: number }
    } | null
  ) => void
  original_editor_state?: {
    file_path: string
    position: { line: number; character: number }
  }
}): Promise<boolean> => {
  let resolve_cleanup_promise: () => void
  ongoing_review_cleanup_promise = new Promise((resolve) => {
    resolve_cleanup_promise = resolve
  })

  try {
    const review_result = await review_applied_changes(
      params.original_states,
      params.view_provider
    )

    if (review_result === null || review_result.accepted_files.length == 0) {
      await undo_files(params.original_states)
      params.update_undo_and_apply_button_state(null)
      return false
    }

    if (review_result.rejected_states.length > 0) {
      await undo_files(review_result.rejected_states)
    }

    const accepted_states = params.original_states.filter((state) =>
      review_result.accepted_files.some(
        (accepted) =>
          accepted.file_path == state.file_path &&
          accepted.workspace_name == state.workspace_name
      )
    )

    if (accepted_states.length > 0) {
      params.update_undo_and_apply_button_state(
        accepted_states,
        params.chat_response,
        params.original_editor_state
      )
      return true
    } else {
      params.update_undo_and_apply_button_state(null)
      return false
    }
  } finally {
    resolve_cleanup_promise!()
    ongoing_review_cleanup_promise = null
  }
}

export const apply_chat_response_command = (
  context: vscode.ExtensionContext,
  view_provider: ViewProvider
) => {
  const intelligent_update_button_label =
    'Looks off? Call Intelligent Update API tool'

  const update_undo_and_apply_button_state = (
    states: OriginalFileState[] | null,
    applied_content?: string | null,
    original_editor_state?: {
      file_path: string
      position: { line: number; character: number }
    } | null
  ) => {
    if (states && states.length > 0) {
      context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, states)
      context.workspaceState.update(
        LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
        applied_content
      )
      context.workspaceState.update(
        LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
        original_editor_state
      )
      view_provider.set_undo_button_state(true)
      view_provider.set_apply_button_state(false)
    } else {
      context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
      context.workspaceState.update(
        LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
        null
      )
      context.workspaceState.update(
        LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY,
        null
      )
      view_provider.set_undo_button_state(false)
      view_provider.set_apply_button_state(true)
    }
  }

  return vscode.commands.registerCommand(
    'codeWebChat.applyChatResponse',
    async (args?: {
      response?: string
      suppress_fast_replace_notification?: boolean
      original_editor_state?: {
        file_path: string
        position: { line: number; character: number }
      }
    }) => {
      if (code_review_promise_resolve) {
        code_review_promise_resolve({ accepted_files: [] })
        if (ongoing_review_cleanup_promise) {
          await ongoing_review_cleanup_promise
        }
      }

      type ReviewData = {
        original_states: OriginalFileState[]
        chat_response: string
      }

      const review_data = await (async (): Promise<ReviewData | null> => {
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
          return null
        }

        const is_single_root_folder_workspace =
          vscode.workspace.workspaceFolders?.length == 1

        let clipboard_content = parse_response(
          chat_response,
          is_single_root_folder_workspace
        )

        if (
          clipboard_content.type == 'code-completion' &&
          clipboard_content.code_completion
        ) {
          const completion = clipboard_content.code_completion
          if (
            !vscode.workspace.workspaceFolders ||
            vscode.workspace.workspaceFolders.length == 0
          ) {
            vscode.window.showErrorMessage('No workspace folder open.')
            return null
          }
          const workspace_map = new Map<string, string>()
          vscode.workspace.workspaceFolders.forEach((folder) => {
            workspace_map.set(folder.name, folder.uri.fsPath)
          })
          const default_workspace =
            vscode.workspace.workspaceFolders[0].uri.fsPath
          let workspace_root = default_workspace
          if (
            completion.workspace_name &&
            workspace_map.has(completion.workspace_name)
          ) {
            workspace_root = workspace_map.get(completion.workspace_name)!
          }
          const safe_path = create_safe_path(
            workspace_root,
            completion.file_path
          )
          if (!safe_path || !fs.existsSync(safe_path)) {
            vscode.window.showErrorMessage(
              `File not found: ${completion.file_path}`
            )
            Logger.warn({
              function_name: 'apply_chat_response_command',
              message: 'File not found for code completion.',
              data: { file_path: completion.file_path, safe_path }
            })
            return null
          }

          const document = await vscode.workspace.openTextDocument(safe_path)
          const original_content = document.getText()
          const line_index = completion.line - 1
          const char_index = completion.character - 1

          if (
            line_index < 0 ||
            char_index < 0 ||
            line_index >= document.lineCount ||
            char_index > document.lineAt(line_index).text.length
          ) {
            vscode.window.showErrorMessage(
              `Invalid position for code completion in ${completion.file_path}.`
            )
            return null
          }

          const position_offset = document.offsetAt(
            new vscode.Position(line_index, char_index)
          )
          const new_content =
            original_content.slice(0, position_offset) +
            completion.content +
            original_content.slice(position_offset)

          if (!args) args = {}
          if (!args.original_editor_state) {
            args.original_editor_state = {
              file_path: safe_path,
              position: {
                line: line_index,
                character: char_index
              }
            }
          }
          args.suppress_fast_replace_notification = true

          clipboard_content = {
            type: 'files',
            files: [{ ...completion, content: new_content }]
          } as any
        }

        if (clipboard_content.type == 'patches' && clipboard_content.patches) {
          if (!vscode.workspace.workspaceFolders?.length) {
            vscode.window.showErrorMessage('No workspace folder open.')
            return null
          }

          const rename_map = new Map<string, string>()
          clipboard_content.patches.forEach((patch) => {
            if (patch.new_file_path && patch.file_path) {
              rename_map.set(patch.file_path, patch.new_file_path)
            }
          })

          const set_new_paths_in_original_states = (
            states: OriginalFileState[]
          ) => {
            if (!rename_map.size) return
            states.forEach((state) => {
              if (rename_map.has(state.file_path)) {
                state.new_file_path = rename_map.get(state.file_path)!
              }
            })
          }

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

          const total_patches = clipboard_content.patches.length

          for (let i = 0; i < total_patches; i++) {
            const patch = clipboard_content.patches[i]
            let workspace_path = default_workspace

            if (
              patch.workspace_name &&
              workspace_map.has(patch.workspace_name)
            ) {
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

          if (all_original_states.length > 0) {
            set_new_paths_in_original_states(all_original_states)
            await apply_file_relocations(all_original_states)
            update_undo_and_apply_button_state(
              all_original_states,
              chat_response,
              args?.original_editor_state
            )
          }

          if (failure_count > 0) {
            const api_providers_manager = new ApiProvidersManager(context)
            const config_result = await get_intelligent_update_config(
              api_providers_manager,
              false,
              context
            )

            if (!config_result) {
              if (success_count > 0 && all_original_states.length > 0) {
                await undo_files(all_original_states)
                update_undo_and_apply_button_state(null)
              }
              return null
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

            const failed_patches_as_code_blocks = failed_patches
              .map(
                (patch) =>
                  `\`\`\`\n// ${patch.file_path}\n${patch.content}\n\`\`\``
              )
              .join('\n')

            try {
              const intelligent_update_states = await handle_intelligent_update(
                {
                  endpoint_url,
                  api_key: provider.api_key,
                  config: intelligent_update_config,
                  chat_response: failed_patches_as_code_blocks,
                  context: context,
                  is_single_root_folder_workspace,
                  view_provider
                }
              )

              if (intelligent_update_states) {
                const combined_states = [
                  ...all_original_states,
                  ...intelligent_update_states
                ]
                set_new_paths_in_original_states(combined_states)
                await apply_file_relocations(combined_states)
                update_undo_and_apply_button_state(
                  combined_states,
                  chat_response,
                  args?.original_editor_state
                )
                return {
                  original_states: combined_states,
                  chat_response
                }
              } else {
                if (success_count > 0 && all_original_states.length > 0) {
                  await undo_files(all_original_states)
                  update_undo_and_apply_button_state(null)
                }
              }
            } catch (error) {
              Logger.error({
                function_name: 'apply_chat_response_command',
                message: 'Error during intelligent update of failed patches'
              })

              const response = await vscode.window.showErrorMessage(
                'Error during fix attempt with the intelligent update tool. Would you like to undo the successfully applied patches?',
                'Keep changes',
                'Undo'
              )

              if (response == 'Undo' && all_original_states.length > 0) {
                await undo_files(all_original_states)
                update_undo_and_apply_button_state(null)
              }
            }
          } else if (success_count > 0) {
            if (any_patch_used_fallback) {
              ;(async () => {
                const fallback_patches_count = applied_patches.filter(
                  (p) => p.used_fallback
                ).length
                const fallback_files = applied_patches
                  .filter((p) => p.used_fallback)
                  .map((p) => p.patch.file_path)

                Logger.log({
                  function_name: 'apply_chat_response_command',
                  message: 'Patches applied with fallback method',
                  data: {
                    count: fallback_patches_count,
                    total: total_patches,
                    files: fallback_files
                  }
                })
                const message =
                  total_patches > 1
                    ? `${fallback_patches_count} of ${total_patches} patches required an offline fallback method, which may lead to inaccuracies.`
                    : 'The patch required an offline fallback method, which may lead to inaccuracies.'

                const response = await vscode.window.showInformationMessage(
                  message,
                  'Hide',
                  intelligent_update_button_label
                )

                if (response == intelligent_update_button_label) {
                  const fallback_applied_patches = applied_patches.filter(
                    (p) => p.used_fallback
                  )
                  const fallback_states = fallback_applied_patches.flatMap(
                    (p) => p.original_states
                  )
                  await undo_files(fallback_states, false)

                  const non_fallback_states = applied_patches
                    .filter((p) => !p.used_fallback)
                    .flatMap((p) => p.original_states)
                  update_undo_and_apply_button_state(
                    non_fallback_states,
                    chat_response,
                    args?.original_editor_state
                  )

                  const api_providers_manager = new ApiProvidersManager(context)
                  const config_result = await get_intelligent_update_config(
                    api_providers_manager,
                    false,
                    context
                  )

                  if (!config_result) {
                    return null
                  }

                  const fallback_patches = fallback_applied_patches.map(
                    (p) => p.patch
                  )
                  const num_files = fallback_patches.length
                  const progress_title_override = `Called Intelligent Update API tool for ${num_files} file${
                    num_files > 1 ? 's' : ''
                  }`

                  const fallback_patches_as_code_blocks = fallback_patches
                    .map(
                      (patch) =>
                        `\`\`\`\n// ${patch.file_path}\n${patch.content}\n\`\`\``
                    )
                    .join('\n')

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

                  const intelligent_update_states =
                    await handle_intelligent_update({
                      endpoint_url,
                      api_key: provider.api_key,
                      config: intelligent_update_config,
                      chat_response: fallback_patches_as_code_blocks, // Use the patches as instructions
                      context: context,
                      is_single_root_folder_workspace,
                      view_provider,
                      progress_title_override
                    })

                  if (intelligent_update_states) {
                    const final_states = [
                      ...non_fallback_states,
                      ...intelligent_update_states
                    ]
                    set_new_paths_in_original_states(final_states)
                    await apply_file_relocations(final_states)
                    update_undo_and_apply_button_state(
                      final_states,
                      chat_response,
                      args?.original_editor_state
                    )
                    return {
                      original_states: final_states,
                      chat_response
                    }
                  }
                  return null
                }
              })()
            }
            return {
              original_states: all_original_states,
              chat_response
            }
          }

          return null
        } else {
          if (!clipboard_content.files || clipboard_content.files.length == 0) {
            vscode.window.showErrorMessage(
              'Unable to find valid code blocks in the clipboard.'
            )
            return null
          }

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
              return null
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

            final_original_states = await handle_intelligent_update({
              endpoint_url,
              api_key: provider.api_key,
              config: intelligent_update_config,
              chat_response,
              context: context,
              is_single_root_folder_workspace,
              view_provider
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
            return null
          }

          if (operation_success && final_original_states) {
            if (
              selected_mode_label == 'Fast replace' &&
              !all_files_new &&
              !args?.suppress_fast_replace_notification
            ) {
              ;(async () => {
                const file_count = final_original_states!.length
                const response = await vscode.window.showInformationMessage(
                  `File${
                    file_count > 1 ? 's have' : ' has'
                  } been replaced. This may cause inaccuracies if the response had unmarked truncations.`,
                  'Hide',
                  intelligent_update_button_label
                )

                if (response == intelligent_update_button_label) {
                  const original_states_for_undo = final_original_states!
                  await undo_files(original_states_for_undo, false)
                  const num_files = original_states_for_undo.length
                  const progress_title_override = `Called Intelligent Update API tool for ${num_files} file${
                    num_files > 1 ? 's' : ''
                  }`

                  // Clear state while intelligent update runs
                  update_undo_and_apply_button_state(null)

                  const api_providers_manager = new ApiProvidersManager(context)
                  const config_result = await get_intelligent_update_config(
                    api_providers_manager,
                    false,
                    context
                  )

                  if (!config_result) {
                    return // Undone, no config for intelligent update.
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

                  const intelligent_update_states =
                    await handle_intelligent_update({
                      endpoint_url,
                      api_key: provider.api_key,
                      config: intelligent_update_config,
                      chat_response,
                      context: context,
                      is_single_root_folder_workspace,
                      view_provider,
                      progress_title_override
                    })

                  if (intelligent_update_states) {
                    update_undo_and_apply_button_state(
                      intelligent_update_states,
                      chat_response,
                      args?.original_editor_state
                    )
                  }
                }
              })()
            }

            update_undo_and_apply_button_state(
              final_original_states,
              chat_response,
              args?.original_editor_state
            )

            return {
              original_states: final_original_states,
              chat_response
            }
          } else {
            update_undo_and_apply_button_state(null)
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
          return null
        }
      })()

      if (review_data) {
        await handle_code_review_and_cleanup({
          original_states: review_data.original_states,
          chat_response: review_data.chat_response,
          view_provider,
          update_undo_and_apply_button_state,
          original_editor_state: args?.original_editor_state
        })
      }
    }
  )
}
