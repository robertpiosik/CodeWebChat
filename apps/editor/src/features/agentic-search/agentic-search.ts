import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import {
  LAST_SELECTED_WORKSPACE_IN_AGENTIC_SEARCH_STATE_KEY,
  LAST_USED_AGENTIC_SEARCH_AGENT_STATE_KEY,
  LAST_AGENTIC_SEARCH_QUERY_STATE_KEY
} from '@/constants/state-keys'
import { extract_paths_from_bullet_list } from '@/utils/extract-paths-from-bullet-list'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { show_search_results_quick_pick } from '@/features/search-files/utils/show-search-results-quick-pick'
import { prompt_for_search_term } from './utils/prompt-for-search-term'
import { build_agent_prompt } from './utils/build-agent-prompt'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import { search_files } from '@/features/search-files'
import { WebSocketManager } from '@/services/websocket-manager'
import { invoke_agentic_cli } from '@/utils/agentic-cli-invocation'

export const agentic_search = async (params: {
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
  query: string
  current_instructions: string
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | undefined
  | 'back'
> => {
  const roots = params.workspace_provider.get_workspace_roots()

  if (roots.length == 0) {
    return undefined
  }

  let query = params.query

  while (true) {
    const query_result = await prompt_for_search_term(query)

    if (query_result.back) {
      return 'back'
    }

    if (query_result.value === undefined) {
      return undefined
    }

    query = query_result.value

    if (query.trim() == '') {
      continue
    }

    await params.extension_context.workspaceState.update(
      LAST_AGENTIC_SEARCH_QUERY_STATE_KEY,
      {
        instructions: params.current_instructions,
        query
      }
    )

    const last_used_agent_config_name =
      params.extension_context.workspaceState.get<string>(
        LAST_USED_AGENTIC_SEARCH_AGENT_STATE_KEY
      ) ??
      params.extension_context.globalState.get<string>(
        LAST_USED_AGENTIC_SEARCH_AGENT_STATE_KEY
      )

    const result = await invoke_agentic_cli({
      workspace_provider: params.workspace_provider,
      extension_context: params.extension_context,
      title: t('common.title.agentic-search'),
      waiting_message: t(
        'utils.agentic-cli-invocation.agent.waiting-for-agent'
      ),
      last_used_agent_config_name,
      on_agent_selected: (name: string) => {
        params.extension_context.workspaceState.update(
          LAST_USED_AGENTIC_SEARCH_AGENT_STATE_KEY,
          name
        )
        params.extension_context.globalState.update(
          LAST_USED_AGENTIC_SEARCH_AGENT_STATE_KEY,
          name
        )
      },
      last_selected_workspace_state_key:
        LAST_SELECTED_WORKSPACE_IN_AGENTIC_SEARCH_STATE_KEY,
      show_back_button: true,
      build_prompt: async () => {
        const { instructions: processed_query, skill_definitions } =
          await replace_symbols({
            instructions: query,
            extension_context: params.extension_context,
            workspace_provider: params.workspace_provider,
            image_as_paths: true
          })

        const final_query = skill_definitions
          ? `${processed_query}\n\n${skill_definitions}`
          : processed_query

        return build_agent_prompt(final_query)
      }
    })

    if (result === 'back') {
      continue
    }

    if (!result) {
      return undefined
    }

    const { agent_output, selected_root } = result

    if (agent_output.trim() == '') {
      vscode.window.showInformationMessage(
        t('common.info.no-items-found', { items: 'files' })
      )
      continue
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
      new Set(valid_paths.map((p) => path.join(selected_root!, p)))
    ).filter((p) => fs.existsSync(p))

    if (absolute_paths.length === 0) {
      vscode.window.showInformationMessage(
        t('common.info.no-items-found', { items: 'files' })
      )
      continue
    }

    let final_decision:
      | {
          selected_paths: string[]
          matched_paths: string[]
          title: string
        }
      | undefined

    let restored_selected_paths: string[] | undefined = undefined
    let go_back_to_query = false

    while (true) {
      const selected_items = await show_search_results_quick_pick({
        matched_items: absolute_paths.map((path) => ({ path })),
        unmatched_checked_paths: [],
        workspace_provider: params.workspace_provider,
        title: t('views.prompt.handlers.handle-agentic-search.results'),
        show_back_button: true,
        restored_selected_paths
      })

      if (selected_items === 'back') {
        go_back_to_query = true
        break
      }

      if (!selected_items || selected_items === 'cancel') {
        return undefined
      }

      if ('action' in selected_items) {
        const sub_search_result = await search_files({
          get_files: async () => selected_items.matched_paths,
          workspace_provider: params.workspace_provider,
          extension_context: params.extension_context,
          websocket_manager: params.websocket_manager,
          show_back_button: true,
          is_sub_search: true
        })

        if (sub_search_result === 'back') {
          restored_selected_paths = selected_items.selected_paths
          continue
        }

        if (!sub_search_result) {
          return undefined
        }

        final_decision = sub_search_result
        break
      }

      final_decision = selected_items
      break
    }

    if (go_back_to_query) {
      continue
    }

    if (final_decision) {
      return final_decision
    }
  }
}
