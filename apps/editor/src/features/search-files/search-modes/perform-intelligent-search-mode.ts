import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import {
  LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
  LAST_INTELLIGENT_FILE_SEARCH_SHRINK_STATE_KEY,
  LAST_USED_INTELLIGENT_SEARCH_ACTION_STATE_KEY,
  get_last_used_web_configuration_key
} from '@/constants/state-keys'
import { prompt_for_search_term } from '../utils/prompt-for-search-term'
import { analyze_files } from '../utils/analyze-files'
import { prompt_for_shrink_mode } from '../utils/prompt-for-shrink-mode'
import { prompt_for_api_configuration } from '../utils/prompt-for-config'
import { search_files_by_intelligent } from '../utils/search-files-by-intelligent'
import { prompt_for_intelligent_search_results } from '../utils/prompt-for-intelligent-search-results'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { WebSocketManager } from '@/services/websocket-manager'
import { display_token_count } from '@/utils/display-token-count'
import { show_configuration_quick_pick } from '@/utils/show-configuration-quick-pick'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  intelligent_file_search_instructions,
  intelligent_file_search_format_for_prompt_view
} from '@/constants/instructions'

export const perform_intelligent_search_mode = async (params: {
  files: string[]
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
  search_in_results: (
    matched_paths: string[]
  ) => Promise<
    | { selected_paths: string[]; matched_paths: string[]; title: string }
    | undefined
    | 'back'
  >
  show_back_button?: boolean
  is_search_in_selected?: boolean
  folder_path?: string
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | undefined
  | 'back'
> => {
  const local_queries: Record<string, string> = {}

  while (true) {
    const initial_search_term =
      local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY] !== undefined
        ? local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY]
        : params.show_back_button
          ? ''
          : params.extension_context.workspaceState.get<string>(
              LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY
            ) || ''

    const result = await prompt_for_search_term(
      initial_search_term,
      'intelligent',
      undefined,
      (value) => {
        local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY] = value
        if (!params.show_back_button) {
          params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
            value
          )
        }
      }
    )
    if (result.back) return 'back'
    if (!result.value) return undefined

    const search_term = result.value.trim()
    if (search_term.length == 0) return undefined

    local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY] = search_term
    if (!params.show_back_button) {
      await params.extension_context.workspaceState.update(
        LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
        search_term
      )
    }

    const analysis = await analyze_files({
      workspace_provider: params.workspace_provider,
      files: params.files
    })

    let go_back_to_term = false

    while (true) {
      const should_shrink =
        params.extension_context.workspaceState.get<boolean>(
          LAST_INTELLIGENT_FILE_SEARCH_SHRINK_STATE_KEY,
          false
        )
      const shrink_result = await prompt_for_shrink_mode({
        should_shrink,
        full_tokens: analysis.full_tokens,
        shrink_tokens: analysis.shrink_tokens
      })

      if (shrink_result == 'back') {
        go_back_to_term = true
        break
      }
      if (shrink_result == 'cancel') return undefined

      await params.extension_context.workspaceState.update(
        LAST_INTELLIGENT_FILE_SEARCH_SHRINK_STATE_KEY,
        shrink_result
      )

      let go_back_to_shrink = false

      while (true) {
        const model_providers_manager = new ModelProvidersManager(
          params.extension_context
        )
        const api_configurations =
          await model_providers_manager.get_api_configurations()

        const has_api_configurations = api_configurations.length > 0

        const action = await new Promise<string | undefined | 'back'>(
          (resolve) => {
            const quick_pick = vscode.window.createQuickPick<
              vscode.QuickPickItem & { id: string }
            >()
            quick_pick.items = [
              ...(has_api_configurations
                ? [
                    {
                      label: t(
                        'command.generate-commit-message.action.make-api-call'
                      ),
                      id: 'make-api'
                    }
                  ]
                : []),
              ...(params.websocket_manager.is_connected_with_browser()
                ? [
                    {
                      label: t(
                        'command.generate-commit-message.action.autofill-in-chatbot'
                      ),
                      id: 'autofill'
                    }
                  ]
                : []),
              {
                label: t('command.generate-commit-message.action.copy-prompt'),
                id: 'copy'
              }
            ]

            const last_action_id =
              params.extension_context.workspaceState.get<string>(
                LAST_USED_INTELLIGENT_SEARCH_ACTION_STATE_KEY
              )

            const active_item = last_action_id
              ? quick_pick.items.find((i) => i.id == last_action_id)
              : undefined

            if (active_item) {
              quick_pick.activeItems = [active_item]
            } else if (quick_pick.items.length > 0) {
              quick_pick.activeItems = [quick_pick.items[0]]
            }

            quick_pick.title = t('feature.search-files.title.intelligent')
            quick_pick.placeholder = t(
              'command.generate-commit-message.action-quick-pick.placeholder'
            )

            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: t('common.close')
            }

            quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]

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

        if (action == 'back') {
          go_back_to_shrink = true
          break
        }
        if (!action) return undefined

        params.extension_context.workspaceState.update(
          LAST_USED_INTELLIGENT_SEARCH_ACTION_STATE_KEY,
          action
        )

        let go_back_to_action = false

        if (action == 'copy' || action == 'autofill') {
          let md_files = ''
          for (const file of analysis.files_data) {
            const content_to_use = shrink_result
              ? file.shrunk_content
              : file.content
            md_files += `### File: \`${file.display_path}\`\n\n\`\`\`\n${content_to_use}\n\`\`\`\n\n`
          }

          const config = vscode.workspace.getConfiguration('codeWebChat')
          const base_instructions =
            config.get<string>('intelligentFileSearchInstructions') ||
            intelligent_file_search_instructions

          let display_folder_path = params.folder_path
          if (params.folder_path) {
            const root = params.workspace_provider.get_workspace_root_for_file(
              params.folder_path
            )
            if (root) {
              const rel = path
                .relative(root, params.folder_path)
                .replace(/\\/g, '/')
              if (params.workspace_provider.get_workspace_roots().length > 1) {
                const ws_name =
                  params.workspace_provider.get_workspace_name(root)
                display_folder_path = rel ? `${ws_name}/${rel}` : ws_name
              } else {
                display_folder_path = rel || '.'
              }
            }
          }

          let metadata = ''
          if (params.is_search_in_selected) {
            if (display_folder_path) {
              metadata = ` for selected files in folder \`${display_folder_path}\``
            } else {
              metadata = ` for selected files`
            }
          } else if (display_folder_path) {
            metadata = ` for folder \`${display_folder_path}\``
          }

          const format_instructions =
            intelligent_file_search_format_for_prompt_view(metadata)

          const chatbot_prompt = `# Files\n\n${md_files}# Task\n\n${base_instructions}\n\n${search_term}\n\n${format_instructions}`

          if (action == 'copy') {
            await vscode.env.clipboard.writeText(chatbot_prompt)
            const token_count = shrink_result
              ? analysis.shrink_tokens
              : analysis.full_tokens
            vscode.window.showInformationMessage(
              t('command.generate-commit-message.copied', {
                tokens: display_token_count(token_count)
              })
            )
            return undefined
          }

          if (action == 'autofill') {
            const all_web_configurations = config.get<any[]>(
              'webConfigurations',
              []
            )
            const valid_web_configurations = all_web_configurations.filter(
              (c) => c.chatbot
            )

            if (valid_web_configurations.length == 0) {
              vscode.commands.executeCommand('codeWebChat.settings')
              vscode.window.showInformationMessage('No configurations found.')
              go_back_to_action = true
              continue
            }

            let selected_web_configuration_name: string | undefined

            if (valid_web_configurations.length == 1) {
              selected_web_configuration_name = valid_web_configurations[0].name
            } else {
              const recents_key = get_last_used_web_configuration_key(
                'intelligent-file-search'
              )
              const last_selected_name =
                params.extension_context.workspaceState.get<string>(
                  recents_key
                ) ??
                params.extension_context.globalState.get<string>(recents_key)

              const result = await show_configuration_quick_pick({
                items: valid_web_configurations,
                map_item: (web_configuration) => {
                  const is_unnamed =
                    !web_configuration.name ||
                    /^\(\d+\)$/.test(web_configuration.name.trim())
                  const chatbot_models =
                    CHATBOTS[web_configuration.chatbot as keyof typeof CHATBOTS]
                      ?.models
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
                show_back_button: true
              })

              if (result == 'back') {
                go_back_to_action = true
                continue
              } else if (!result) {
                return undefined
              }
              selected_web_configuration_name = result.item.name

              if (selected_web_configuration_name) {
                params.extension_context.workspaceState.update(
                  recents_key,
                  selected_web_configuration_name
                )
                params.extension_context.globalState.update(
                  recents_key,
                  selected_web_configuration_name
                )
              }
            }

            if (selected_web_configuration_name) {
              const sent = await params.websocket_manager.initialize_chat({
                text: chatbot_prompt,
                web_configuration_name: selected_web_configuration_name,
                invocation_count: 1,
                inject_apply_response_button: true
              })
              if (sent) {
                vscode.window.showInformationMessage(
                  'Continue in the connected browser'
                )
              }
            }

            return undefined
          }
        }

        if (action == 'make-api') {
          let force_prompt = false
          let break_outer = false
          let final_result:
            | {
                selected_paths: string[]
                matched_paths: string[]
                title: string
              }
            | undefined = undefined

          while (true) {
            const tokens_to_process = shrink_result
              ? analysis.shrink_tokens
              : analysis.full_tokens
            const api_configuration_result = await prompt_for_api_configuration(
              {
                model_providers_manager,
                extension_context: params.extension_context,
                api_configurations,
                tokens_to_process,
                force_prompt
              }
            )

            force_prompt = false

            if (api_configuration_result == 'back') {
              go_back_to_action = true
              break
            }
            if (api_configuration_result == 'cancel') return undefined

            const {
              api_configuration: selected_api_configuration,
              model_provider
            } = api_configuration_result

            const api_result = await search_files_by_intelligent(
              analysis.files_data,
              shrink_result as boolean,
              search_term,
              model_provider,
              selected_api_configuration
            )

            if (api_result == 'cancel') return undefined
            if (api_result == 'error') {
              force_prompt = true
              continue
            }
            if (api_result == 'error_no_files') {
              vscode.window.showWarningMessage(
                t('feature.search-files.no-files')
              )
              go_back_to_term = true
              break
            }

            let go_back_to_term_from_results = false
            let restored_selected_paths: string[] | undefined = undefined
            let restored_unmatched_paths: string[] | undefined = undefined

            while (true) {
              const apply_result = await prompt_for_intelligent_search_results({
                files: params.files,
                extracted_files: api_result,
                analysis,
                workspace_provider: params.workspace_provider,
                restored_selected_paths,
                restored_unmatched_paths,
                is_search_in_selected: params.is_search_in_selected
              })

              if (apply_result == 'back') {
                go_back_to_term_from_results = true
                break
              }
              if (apply_result == 'cancel') {
                return undefined
              }

              if ('action' in apply_result) {
                const sub_result = await params.search_in_results(
                  apply_result.matched_paths
                )
                if (sub_result === 'back') {
                  restored_selected_paths = apply_result.selected_paths
                  restored_unmatched_paths = apply_result.unmatched_paths
                  continue
                }
                return sub_result
              }

              final_result = apply_result
              break_outer = true
              break
            }

            if (break_outer) return final_result
            if (go_back_to_term_from_results) {
              go_back_to_term = true
              break
            }
          }
        }

        if (go_back_to_term) break
        if (go_back_to_action) continue
      }

      if (go_back_to_term) break
      if (go_back_to_shrink) continue
    }

    if (go_back_to_term) continue
    break
  }
  return undefined
}
