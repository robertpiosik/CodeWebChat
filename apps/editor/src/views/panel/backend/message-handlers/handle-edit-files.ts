import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ModelProvider
} from '@/services/model-providers-manager'
import axios from 'axios'
import {
  API_EDIT_FORMAT_STATE_KEY,
  LAST_USED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
} from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { ApiConfiguration } from '@/services/model-providers-manager'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { EditFilesMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import {
  EDIT_FORMAT_INSTRUCTIONS_WHOLE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_DIFF
} from '@/constants/edit-format-instructions'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/panel/backend/utils/symbols/replace-symbols'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { PromptBuilder } from '@/utils/prompt-builder'

const get_edit_files_api_configuration = async (params: {
  model_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  context: vscode.ExtensionContext
  panel_provider: PanelProvider
  api_configuration_id?: string
}): Promise<
  | { model_provider: ModelProvider; api_configuration: ApiConfiguration }
  | undefined
> => {
  const edit_files_api_configurations =
    await params.model_providers_manager.get_api_configurations()

  if (edit_files_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_EDIT_FILES_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      edit_files_api_configurations.find(
        (c) => get_api_configuration_id(c) == params.api_configuration_id
      ) || null
    if (selected_api_configuration) {
      params.context.workspaceState.update(
        LAST_USED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY,
        params.api_configuration_id
      )

      if (params.panel_provider) {
        params.panel_provider.send_message({
          command: 'SELECTED_API_CONFIGURATION_CHANGED',
          prompt_type: 'edit-files',
          id: params.api_configuration_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    const last_selected_id = params.context.workspaceState.get<string>(
      LAST_USED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
    )

    if (last_selected_id) {
      selected_api_configuration =
        edit_files_api_configurations.find(
          (c) => get_api_configuration_id(c) == last_selected_id
        ) || null
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const last_selected_id = params.context.workspaceState.get<string>(
      LAST_USED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY
    )

    const result = await show_configuration_quick_pick({
      items: edit_files_api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id
    })

    if (params.panel_provider) {
      params.panel_provider.send_message({
        command: 'FOCUS_PROMPT_FIELD'
      })
    }

    if (!result || result === 'back') {
      return undefined
    }

    const { item: api_configuration, id } = result

    params.context.workspaceState.update(
      LAST_USED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY,
      id
    )

    if (params.panel_provider) {
      params.panel_provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: 'edit-files',
        id: id
      })
    }

    selected_api_configuration = api_configuration
  }

  const model_provider =
    await params.model_providers_manager.get_model_provider(
      selected_api_configuration.model_provider_name
    )

  if (!model_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_edit_files_api_configuration',
      message: 'API provider not found for Edit Files tool.'
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_edit_files = async (
  panel_provider: PanelProvider,
  message: EditFilesMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const model_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )

  const files_collector = new FilesCollector({
    workspace_provider: panel_provider.workspace_provider,
    open_editors_provider: panel_provider.open_editors_provider
  })

  const instructions = panel_provider.current_edit_context_instruction

  if (!instructions) {
    panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Instructions cannot be empty',
      type: 'warning'
    })
    return
  }

  const { instruction: processed_instructions, skill_definitions } =
    await replace_symbols({
      instruction: instructions,
      context: panel_provider.context,
      workspace_provider: panel_provider.workspace_provider
    })

  panel_provider.api_prompt_type == 'find-relevant-files'
  const collected = await files_collector.collect_files({})
  const collected_files = collected.other_files + collected.recent_files

  if (!collected_files) {
    panel_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: 'Context cannot be empty',
      type: 'warning'
    })
    return
  }

  let current_api_configuration_id = message.api_configuration_id
  let should_show_quick_pick = message.use_quick_pick

  while (true) {
    const api_configuration_result = await get_edit_files_api_configuration({
      model_providers_manager,
      show_quick_pick: should_show_quick_pick,
      context: panel_provider.context,
      panel_provider,
      api_configuration_id: current_api_configuration_id
    })

    if (!api_configuration_result) {
      return
    }

    const { model_provider, api_configuration: edit_files_api_configuration } =
      api_configuration_result

    const endpoint_url = model_provider.base_url

    const edit_format =
      panel_provider.context.workspaceState.get<EditFormat>(
        API_EDIT_FORMAT_STATE_KEY
      ) ??
      panel_provider.context.globalState.get<EditFormat>(
        API_EDIT_FORMAT_STATE_KEY
      ) ??
      'whole'
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const instructions_key = {
      whole: 'editFormatInstructionsWhole',
      truncated: 'editFormatInstructionsTruncated',
      diff: 'editFormatInstructionsDiff',
      'search-replace': 'editFormatInstructionsSearchReplace'
    }[edit_format]
    const default_instructions = {
      whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
      truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
      diff: EDIT_FORMAT_INSTRUCTIONS_DIFF,
      'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
    }[edit_format]
    const edit_format_instructions =
      config.get<string>(instructions_key) || default_instructions

    let formatted_system_instructions = ''
    if (edit_format_instructions) {
      formatted_system_instructions = `# System\n\n${edit_format_instructions}`
    }

    const system_instructions =
      vscode.workspace
        .getConfiguration('codeWebChat')
        .get<string>('editFilesSystemInstructions') ||
      default_system_instructions

    const { part1, part2 } = PromptBuilder.build_prompt({
      other_files: collected.other_files,
      recent_files: collected.recent_files,
      skill_definitions,
      system_instructions: formatted_system_instructions,
      user_instructions: processed_instructions
    })

    const user_content = build_user_content({
      model_provider,
      part1,
      part2
    })

    const messages = [
      ...(system_instructions
        ? [
            {
              role: 'system',
              content: system_instructions
            }
          ]
        : []),
      {
        role: 'user',
        content: user_content
      }
    ]

    let error_occurred = false
    let was_cancelled = false

    const promises = Array.from({ length: message.invocation_count }).map(
      async () => {
        const body: { [key: string]: any } = {
          messages,
          model: edit_files_api_configuration.model,
          temperature: edit_files_api_configuration.temperature
        }

        apply_reasoning_effort({
          body,
          model_provider,
          reasoning_effort: edit_files_api_configuration.reasoning_effort
        })

        try {
          const result = await panel_provider.api_manager.get({
            endpoint_url,
            api_key: model_provider.api_key,
            body,
            provider_name: edit_files_api_configuration.model_provider_name,
            model: edit_files_api_configuration.model,
            reasoning_effort: edit_files_api_configuration.reasoning_effort
          })

          if (result) {
            vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
              response: result.response,
              raw_instructions: instructions,
              edit_format,
              recent_api_configuration: {
                model_provider:
                  edit_files_api_configuration.model_provider_name,
                model: edit_files_api_configuration.model,
                reasoning_effort: edit_files_api_configuration.reasoning_effort
              }
            })
            return true
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            was_cancelled = true
            return false
          }
          Logger.error({
            function_name: 'handle_edit_files',
            message: 'edit files task error',
            data: error
          })
          if (!error_occurred) {
            vscode.window.showErrorMessage(
              dictionary.error_message.EDIT_FILES_ERROR
            )
            error_occurred = true
          }
          return false
        }
        return false
      }
    )

    const results = await Promise.all(promises)

    if (error_occurred || was_cancelled) return

    if (results.some((r) => r)) {
      return
    } else {
      should_show_quick_pick = true
      current_api_configuration_id = undefined
    }
  }
}
