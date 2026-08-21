import * as vscode from 'vscode'
import { t } from '@/i18n'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ModelProvider,
  ApiConfiguration
} from '@/services/model-providers-manager'
import axios from 'axios'
import { LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { MakeApiCallMessage } from '@/views/prompt/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { build_user_content } from '@/utils/build-user-content'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { PromptBuilder } from '@/utils/prompt-builder'
import { ApiPromptType } from '@shared/types/prompt-types'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'

const get_last_used_config_id_key = () => {
  return LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY
}

const get_api_configuration = async (params: {
  model_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  api_configuration_id?: string
  prompt_type: ApiPromptType
}): Promise<
  | { model_provider: ModelProvider; api_configuration: ApiConfiguration }
  | undefined
> => {
  const api_configurations =
    await params.model_providers_manager.get_api_configurations()

  if (api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(t('common.no-configurations-found'))
    return
  }

  const last_used_key = get_last_used_config_id_key()
  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      api_configurations.find(
        (c) => get_api_configuration_id(c) == params.api_configuration_id
      ) || null
    if (selected_api_configuration) {
      params.extension_context.workspaceState.update(
        last_used_key,
        params.api_configuration_id
      )

      if (params.prompt_view_provider) {
        params.prompt_view_provider.send_message({
          command: 'SELECTED_API_CONFIGURATION_CHANGED',
          prompt_type: params.prompt_type,
          id: params.api_configuration_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(last_used_key)

    if (last_selected_id) {
      selected_api_configuration =
        api_configurations.find(
          (c) => get_api_configuration_id(c) == last_selected_id
        ) || null
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(last_used_key)

    const result = await show_configuration_quick_pick({
      items: api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id
    })

    if (params.prompt_view_provider) {
      params.prompt_view_provider.send_message({
        command: 'FOCUS_PROMPT_FIELD'
      })
    }

    if (!result || result == 'back') {
      return undefined
    }

    const { item: api_configuration, id } = result
    params.extension_context.workspaceState.update(last_used_key, id)

    if (params.prompt_view_provider) {
      params.prompt_view_provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: params.prompt_type,
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
    vscode.window.showErrorMessage(t('common.error.api-provider-not-found'))
    Logger.warn({
      function_name: 'get_api_configuration',
      message: `API provider not found for ${params.prompt_type} tool.`
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_make_api_call = async (
  prompt_view_provider: PromptViewProvider,
  message: MakeApiCallMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const { prompt_type } = message
  const model_providers_manager = new ModelProvidersManager(
    prompt_view_provider.extension_context
  )

  let instructions = ''
  if (prompt_type == 'edit-files') {
    instructions = prompt_view_provider.current_edit_files_instruction
  }

  if (!instructions) {
    prompt_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: t(
        'views.prompt.handlers.make-api-call.instructions-cannot-be-empty'
      ),
      type: 'warning'
    })
    return
  }

  const { instruction: processed_instructions, skill_definitions } =
    await replace_symbols({
      instruction: instructions,
      extension_context: prompt_view_provider.extension_context,
      workspace_provider: prompt_view_provider.workspace_provider
    })

  const collected = await FilesCollector.collect_files({
    workspace_provider: prompt_view_provider.workspace_provider,
    open_editors_provider: prompt_view_provider.open_editors_provider
  })
  const collected_files = collected.other_files + collected.recent_files

  if (!collected_files) {
    prompt_view_provider.send_message({
      command: 'SHOW_AUTO_CLOSING_MODAL',
      title: t('views.prompt.handlers.make-api-call.context-cannot-be-empty'),
      type: 'warning'
    })
    return
  }

  let current_api_configuration_id = message.api_configuration_id
  let should_show_quick_pick = message.use_quick_pick

  while (true) {
    const api_configuration_result = await get_api_configuration({
      model_providers_manager,
      show_quick_pick: should_show_quick_pick,
      extension_context: prompt_view_provider.extension_context,
      prompt_view_provider,
      api_configuration_id: current_api_configuration_id,
      prompt_type
    })

    if (!api_configuration_result) {
      return
    }

    prompt_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { model_provider, api_configuration } = api_configuration_result

    let edit_format: EditFormat = 'whole'
    let system_instructions = ''
    let user_content = ''

    if (prompt_type == 'edit-files') {
      edit_format = prompt_view_provider.edit_format
      const edit_format_instructions = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF,
        'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
      }[edit_format]

      let formatted_system_instructions = ''
      if (edit_format_instructions) {
        formatted_system_instructions = `# Output formatting\n\n${edit_format_instructions}`
      }

      system_instructions =
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
      user_content = build_user_content({ model_provider, part1, part2 })
    }

    const messages = [
      ...(system_instructions
        ? [{ role: 'system', content: system_instructions }]
        : []),
      { role: 'user', content: user_content }
    ]

    let error_occurred = false
    let was_cancelled = false

    const promises = Array.from({ length: message.invocation_count }).map(
      async () => {
        const body: { [key: string]: any } = {
          messages,
          model: api_configuration.model
        }

        apply_reasoning_effort({
          body,
          model_provider,
          reasoning_effort: api_configuration.reasoning_effort
        })

        try {
          let result: { response: string; thoughts?: string } | null = null

          result =
            await prompt_view_provider.prompt_view_api_calls_manager.send_llm_message(
              {
                base_url: model_provider.base_url,
                api_key: model_provider.api_key,
                body,
                provider_name: api_configuration.model_provider_name,
                model: api_configuration.model,
                reasoning_effort: api_configuration.reasoning_effort,
                raw_instructions: instructions
              }
            )

          if (result) {
            const recent_api_configuration = {
              model_provider: api_configuration.model_provider_name,
              model: api_configuration.model,
              reasoning_effort: api_configuration.reasoning_effort
            }

            if (prompt_type == 'edit-files') {
              vscode.commands.executeCommand('codeWebChat.applyResponse', {
                response: result.response,
                raw_instructions: instructions,
                edit_format,
                recent_api_configuration
              })
            }
            return true
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            was_cancelled = true
            return false
          }
          Logger.error({
            function_name: 'handle_make_api_call',
            message: `${prompt_type} task error`,
            data: error
          })
          if (!error_occurred) {
            const err_msg = dictionary.error_message.EDIT_FILES_ERROR
            vscode.window.showErrorMessage(err_msg)
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
