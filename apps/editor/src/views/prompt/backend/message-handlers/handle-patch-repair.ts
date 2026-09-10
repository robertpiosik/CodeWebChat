import * as vscode from 'vscode'
import axios from 'axios'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY,
  LAST_USED_PATCH_REPAIR_ACTION_STATE_KEY
} from '@/constants/state-keys'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import { dictionary } from '@shared/constants/dictionary'
import { parse_response } from '@/commands/apply-response-command/utils/response-parser'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import {
  get_patch_repair_config,
  process_file
} from './utils/patch-repair-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { set_file_applied_with_patch_repair } from '@/commands/apply-response-command/utils/preview'
import { t } from '@/i18n'
import { show_no_configurations_warning } from '@/utils/show-no-configurations-warning'
import { show_configuration_quick_pick } from '@/utils/show-configuration-quick-pick'
import { get_last_used_web_configuration_key } from '@/constants/state-keys'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  patch_repair_format_instructions,
  patch_repair_task_instructions
} from '@/constants/instructions'

export const handle_patch_repair = async (params: {
  prompt_view_provider: PromptViewProvider
  files_to_fix: { file_path: string; workspace_name?: string }[]
  show_quick_pick?: boolean
  is_auto_run?: boolean
}): Promise<void> => {
  const original_states =
    params.prompt_view_provider.extension_context.workspaceState.get<
      OriginalFileState[]
    >(LAST_APPLIED_CHANGES_STATE_KEY)
  const last_response =
    params.prompt_view_provider.extension_context.workspaceState.get<string>(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
    )

  if (!original_states || !last_response) {
    vscode.window.showErrorMessage(
      dictionary.error_message.PATCH_REPAIR_CONTEXT_NOT_FOUND
    )
    return
  }

  const failed_files = original_states.filter((s) =>
    params.files_to_fix.some(
      (f) => f.file_path == s.file_path && f.workspace_name == s.workspace_name
    )
  )

  if (failed_files.length == 0) {
    return
  }

  const successful_files = new Set<string>()

  const is_single_root_folder_workspace =
    (vscode.workspace.workspaceFolders?.length ?? 0) <= 1
  const parsed_response = parse_response({
    response: last_response,
    is_single_root_folder_workspace
  })

  const default_workspace_path =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  // Prepare files to process
  const files_to_process = failed_files
    .map((file_state) => {
      const relevant_item = parsed_response.find((item) => {
        if (item.type == 'file' || item.type == 'code-at-cursor') {
          return (
            item.file_path == file_state.file_path &&
            (!item.workspace_name ||
              item.workspace_name == file_state.workspace_name)
          )
        }
        if (item.type == 'diff') {
          return (
            (item.file_path == file_state.file_path ||
              item.new_file_path == file_state.file_path) &&
            (!item.workspace_name ||
              item.workspace_name == file_state.workspace_name)
          )
        }
        return false
      })

      let instructions = ''
      if (
        relevant_item &&
        (relevant_item.type == 'file' ||
          relevant_item.type == 'diff' ||
          relevant_item.type == 'code-at-cursor')
      ) {
        instructions = relevant_item.content
      }

      let workspace_root = default_workspace_path!
      if (file_state.workspace_name) {
        const folder = vscode.workspace.workspaceFolders?.find(
          (f) => f.name == file_state.workspace_name
        )
        if (folder) workspace_root = folder.uri.fsPath
      }

      const safe_path = create_safe_path(workspace_root, file_state.file_path)

      return {
        file_state,
        instructions,
        safe_path
      }
    })
    .filter((item) => item.instructions && item.safe_path)

  if (files_to_process.length === 0) return

  const model_providers_manager = new ModelProvidersManager(
    params.prompt_view_provider.extension_context
  )

  const api_configurations =
    await model_providers_manager.get_api_configurations()
  const has_api_configurations = api_configurations.length > 0

  let skip_action_quick_pick = false
  if (params.is_auto_run) {
    const default_config =
      await model_providers_manager.get_default_patch_repair_api_configuration()
    if (default_config || api_configurations.length === 1) {
      skip_action_quick_pick = true
    }
  }

  let action: string | undefined = 'make-api'

  if (skip_action_quick_pick) {
    action = 'make-api'
  } else {
    action = await new Promise<string | undefined>((resolve) => {
      const quick_pick = vscode.window.createQuickPick<
        vscode.QuickPickItem & { id: string }
      >()
      quick_pick.items = [
        ...(has_api_configurations
          ? [
              {
                label: t('common.action.send-request'),
                id: 'make-api'
              }
            ]
          : []),
        ...(params.prompt_view_provider.websocket_server_instance.is_connected_with_browser()
          ? [
              {
                label: t('common.action.autofill-chatbot'),
                id: 'autofill'
              }
            ]
          : []),
        {
          label: t('common.action.copy-prompt'),
          id: 'copy'
        },
        {
          label: 'Apply from clipboard',
          id: 'apply-from-clipboard'
        }
      ]

      const last_action_id =
        params.prompt_view_provider.extension_context.workspaceState.get<string>(
          LAST_USED_PATCH_REPAIR_ACTION_STATE_KEY
        ) ??
        params.prompt_view_provider.extension_context.globalState.get<string>(
          LAST_USED_PATCH_REPAIR_ACTION_STATE_KEY
        )

      const active_item = last_action_id
        ? quick_pick.items.find((i) => i.id == last_action_id)
        : undefined

      if (active_item) {
        quick_pick.activeItems = [active_item]
      } else if (quick_pick.items.length > 0) {
        quick_pick.activeItems = [quick_pick.items[0]]
      }

      quick_pick.title = 'Prompt Repair'
      quick_pick.placeholder = t(
        'common.action-quick-pick.placeholder.no-tokens'
      )

      let is_resolved = false

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
    })

    if (!action) return

    params.prompt_view_provider.extension_context.workspaceState.update(
      LAST_USED_PATCH_REPAIR_ACTION_STATE_KEY,
      action
    )
    params.prompt_view_provider.extension_context.globalState.update(
      LAST_USED_PATCH_REPAIR_ACTION_STATE_KEY,
      action
    )
  }

  if (action == 'apply-from-clipboard') {
    await vscode.commands.executeCommand('codeWebChat.applyResponse')
    return
  }

  if (action === 'copy') {
    let chatbot_prompt = ''
    for (const item of files_to_process) {
      const backticks = item.file_state.content.includes('```') ? '````' : '```'
      const display_path =
        !is_single_root_folder_workspace && item.file_state.workspace_name
          ? `${item.file_state.workspace_name}/${item.file_state.file_path}`
          : item.file_state.file_path
      chatbot_prompt += `# File: \`${display_path}\`\n\n${backticks}\n${item.file_state.content}\n${backticks}\n\n${item.instructions}\n\n`
    }
    chatbot_prompt += `# Output formatting\n\n`
    chatbot_prompt += `${patch_repair_format_instructions}\n\n`
    chatbot_prompt += `# Task\n\n${patch_repair_task_instructions}`

    await vscode.env.clipboard.writeText(chatbot_prompt)
    vscode.window.showInformationMessage(t('common.info.copied-to-clipboard'))
    return
  }

  if (action === 'autofill') {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const all_web_configurations = config.get<any[]>('webConfigurations', [])
    const valid_web_configurations = all_web_configurations.filter(
      (c) => c.chatbot
    )

    if (valid_web_configurations.length == 0) {
      show_no_configurations_warning('web')
      return
    }

    let selected_web_configuration_name: string | undefined

    if (valid_web_configurations.length == 1) {
      selected_web_configuration_name = valid_web_configurations[0].name
    } else {
      const recents_key = get_last_used_web_configuration_key('patch-repair')
      const last_selected_name =
        params.prompt_view_provider.extension_context.workspaceState.get<string>(
          recents_key
        ) ??
        params.prompt_view_provider.extension_context.globalState.get<string>(
          recents_key
        )

      const result = await show_configuration_quick_pick({
        items: valid_web_configurations,
        map_item: (web_configuration) => {
          const is_unnamed =
            !web_configuration.name ||
            /^\(\d+\)$/.test(web_configuration.name.trim())
          const chatbot_models =
            CHATBOTS[web_configuration.chatbot as keyof typeof CHATBOTS]?.models
          const model = web_configuration.model
            ? chatbot_models?.[web_configuration.model]?.label ||
              web_configuration.model
            : ''
          const details: string[] = []
          if (!is_unnamed && web_configuration.chatbot)
            details.push(web_configuration.chatbot)
          if (model) details.push(model)
          if (web_configuration.reasoningEffort)
            details.push(web_configuration.reasoningEffort)
          return {
            label: `${is_unnamed ? web_configuration.chatbot! : web_configuration.name!.replace(/\s*\(\d+\)$/, '')}`,
            description: details.join(' · '),
            id: web_configuration.name || '',
            is_pinned: web_configuration.isPinned
          }
        },
        last_selected_id: last_selected_name,
        show_back_button: false
      })

      if (!result || result === 'back') {
        return
      }
      selected_web_configuration_name = result.item.name

      if (selected_web_configuration_name) {
        params.prompt_view_provider.extension_context.workspaceState.update(
          recents_key,
          selected_web_configuration_name
        )
        params.prompt_view_provider.extension_context.globalState.update(
          recents_key,
          selected_web_configuration_name
        )
      }
    }

    if (selected_web_configuration_name) {
      let chatbot_prompt = ''
      for (const item of files_to_process) {
        const backticks = item.file_state.content.includes('```')
          ? '````'
          : '```'
        const display_path =
          !is_single_root_folder_workspace && item.file_state.workspace_name
            ? `${item.file_state.workspace_name}/${item.file_state.file_path}`
            : item.file_state.file_path
        chatbot_prompt += `# File: \`${display_path}\`\n\n${backticks}\n${item.file_state.content}\n${backticks}\n\n${item.instructions}\n\n`
      }
      chatbot_prompt += `# Output formatting\n\n`
      chatbot_prompt += `${patch_repair_format_instructions}\n\n`
      chatbot_prompt += `# Task\n\n${patch_repair_task_instructions}`

      const sent =
        await params.prompt_view_provider.websocket_server_instance.initialize_chat(
          {
            text: chatbot_prompt,
            web_configuration_name: selected_web_configuration_name,
            inject_apply_response_button: true
          }
        )

      if (sent) {
        vscode.window.showInformationMessage(
          'Continue in the connected browser'
        )
      }
    }

    return
  }

  const api_configuration_result = await get_patch_repair_config({
    model_providers_manager,
    show_quick_pick: params.show_quick_pick ?? false,
    extension_context: params.prompt_view_provider.extension_context
  })
  if (!api_configuration_result) return

  const {
    model_provider: api_model_provider,
    api_configuration: patch_repair_api_configuration
  } = api_configuration_result

  const batch_abort_controllers: AbortController[] = []

  try {
    await Promise.all(
      files_to_process.map(async ({ file_state, instructions, safe_path }) => {
        if (!safe_path) return

        const file_path = file_state.file_path
        const workspace_name = file_state.workspace_name

        const abort_controller = new AbortController()
        batch_abort_controllers.push(abort_controller)

        params.prompt_view_provider.patch_repair_abort_controllers.push({
          controller: abort_controller,
          file_path,
          workspace_name
        })

        params.prompt_view_provider.send_message({
          command: 'UPDATE_FILE_PROGRESS',
          file_path,
          workspace_name,
          is_applying: true,
          apply_status: 'waiting'
        })

        const on_thinking_chunk = () => {
          params.prompt_view_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: true,
            apply_status: 'thinking'
          })
        }

        const original_file_size = file_state.content.length
        const estimated_total_tokens = Math.ceil(original_file_size / 4)

        const on_chunk = (tokens_per_second: number, total_tokens: number) => {
          let progress: number | undefined
          if (estimated_total_tokens > 0) {
            progress = Math.min(
              Math.round((total_tokens / estimated_total_tokens) * 100),
              100
            )
          }

          params.prompt_view_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: true,
            apply_status: 'receiving',
            apply_progress: progress,
            apply_tokens_per_second: tokens_per_second
          })
        }

        try {
          const updated_content = await process_file({
            base_url: api_model_provider.base_url,
            api_key: api_model_provider.api_key,
            model_provider: api_model_provider,
            model: patch_repair_api_configuration.model,
            reasoning_effort: patch_repair_api_configuration.reasoning_effort,
            file_path: file_path,
            file_content: file_state.content,
            instruction: instructions,
            abort_signal: abort_controller.signal,
            on_chunk,
            on_thinking_chunk
          })

          if (updated_content) {
            params.prompt_view_provider.send_message({
              command: 'UPDATE_FILE_PROGRESS',
              file_path,
              workspace_name,
              is_applying: true,
              apply_status: 'done',
              apply_progress: 100
            })

            const original_ends_with_newline = file_state.content.endsWith('\n')
            const updated_ends_with_newline = updated_content.endsWith('\n')

            let final_content = updated_content
            if (original_ends_with_newline && !updated_ends_with_newline) {
              final_content = updated_content + '\n'
            } else if (
              !original_ends_with_newline &&
              updated_ends_with_newline
            ) {
              final_content = updated_content.slice(0, -1)
            }

            if (set_file_applied_with_patch_repair) {
              set_file_applied_with_patch_repair({
                file_path,
                workspace_name
              })
            }

            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(safe_path),
              Buffer.from(final_content, 'utf8')
            )

            successful_files.add(
              workspace_name ? `${workspace_name}:${file_path}` : file_path
            )
          }
        } catch (error: any) {
          if (
            !axios.isCancel(error) &&
            error.message != 'User cancelled the operation' &&
            error.message !=
              'Batch operation failed, triggering configuration selection.'
          ) {
            Logger.error({
              function_name: 'handle_patch_repair',
              message: 'Error during process_file',
              data: { error, file_path }
            })

            vscode.window.showErrorMessage(
              dictionary.error_message.APPLYING_CHANGES_GENERIC_ERROR(
                error.message
              )
            )
          }

          batch_abort_controllers.forEach((controller) => {
            controller.abort(
              'Batch operation failed, triggering configuration selection.'
            )
          })

          throw error
        } finally {
          params.prompt_view_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: false
          })

          const index =
            params.prompt_view_provider.patch_repair_abort_controllers.findIndex(
              (s) => s.controller === abort_controller
            )
          if (index > -1) {
            params.prompt_view_provider.patch_repair_abort_controllers.splice(
              index,
              1
            )
          }
        }
      })
    )
  } catch (error: any) {
    const remaining_files = params.files_to_fix.filter((f) => {
      const key = f.workspace_name
        ? `${f.workspace_name}:${f.file_path}`
        : f.file_path
      return !successful_files.has(key)
    })

    if (remaining_files.length > 0) {
      await handle_patch_repair({
        prompt_view_provider: params.prompt_view_provider,
        files_to_fix: remaining_files,
        show_quick_pick: true
      })
    }
  }
}
