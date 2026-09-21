import * as vscode from 'vscode'
import { t } from '@/i18n'
import { build_prompt_payload } from './utils/build-prompt-payload'
import { Logger } from '@shared/utils/logger'
import {
  ProvidersManager,
  get_api_configuration_id,
  Provider,
  ApiConfiguration
} from '@/services/providers-manager'
import axios from 'axios'
import { LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { MakeApiCallMessage } from '@/views/prompt/types/messages'
import { build_user_content } from '@/utils/build-user-content'
import { show_configurations_quick_pick } from '@/utils/show-configurations-quick-pick'
import { PromptBuilder } from '@/utils/prompt-builder'
import { ApiPromptType } from '@shared/types/prompt-types'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'
import { PROVIDERS } from '@/constants/providers'
import { show_incomplete_setup_warning } from '@/utils/show-missing-configuration-notification'

const get_last_used_config_id_key = () => {
  return LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY
}

const get_api_configuration = async (params: {
  providers_manager: ProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  api_configuration_id?: string
  prompt_type: ApiPromptType
}): Promise<
  { provider: Provider; api_configuration: ApiConfiguration } | undefined
> => {
  const api_configurations =
    await params.providers_manager.get_api_configurations()

  if (api_configurations.length == 0) {
    show_incomplete_setup_warning('api')
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

    if (!selected_api_configuration && api_configurations.length == 1) {
      selected_api_configuration = api_configurations[0]
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(last_used_key)

    const result = await show_configurations_quick_pick({
      items: api_configurations,
      type: 'api',
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

  const provider = await params.providers_manager.get_provider(
    selected_api_configuration.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      t('common.error.provider-not-found', {
        name: selected_api_configuration.provider_name
      })
    )
    Logger.warn({
      function_name: 'get_api_configuration',
      message: `API provider not found for ${params.prompt_type} tool.`
    })
    return
  }

  return {
    provider,
    api_configuration: selected_api_configuration
  }
}

export const handle_make_api_call = async (
  prompt_view_provider: PromptViewProvider,
  message: MakeApiCallMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const prompt_type = prompt_view_provider.prompt_type as ApiPromptType
  const providers_manager = new ProvidersManager(
    prompt_view_provider.extension_context
  )

  const current_instructions = prompt_view_provider.current_instructions.trim()

  if (!current_instructions) {
    vscode.window.showInformationMessage(
      t(
        'views.prompt.handlers.handle-make-api-call.instructions-cannot-be-empty'
      )
    )
    return
  }

  const {
    other_files,
    recent_files,
    collected_files,
    processed_instructions,
    skill_definitions
  } = await build_prompt_payload({
    prompt_view_provider
  })

  if (!collected_files) {
    vscode.window.showInformationMessage(
      t('views.prompt.handlers.handle-make-api-call.context-cannot-be-empty')
    )
    return
  }

  let current_api_configuration_id = message.api_configuration_id
  let show_quick_pick = message.use_quick_pick

  while (true) {
    const api_configuration_result = await get_api_configuration({
      providers_manager,
      show_quick_pick,
      extension_context: prompt_view_provider.extension_context,
      prompt_view_provider,
      api_configuration_id: current_api_configuration_id,
      prompt_type
    })

    if (!api_configuration_result) {
      return
    }

    prompt_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { provider, api_configuration } = api_configuration_result

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

      const config = vscode.workspace.getConfiguration('codeWebChat')
      system_instructions =
        config.get<string>('editFilesSystemInstructions') ||
        config.inspect<string>('editFilesSystemInstructions')?.defaultValue ||
        ''

      const { part1, part2 } = PromptBuilder.build_prompt({
        other_files,
        recent_files,
        skill_definitions,
        system_instructions: formatted_system_instructions,
        user_instructions: processed_instructions,
        separator: true
      })
      user_content = build_user_content({
        provider,
        part1,
        part2
      })
    }

    const messages = [
      ...(system_instructions
        ? [{ role: 'system', content: system_instructions }]
        : []),
      { role: 'user', content: user_content }
    ]

    let error_occurred = false

    const body: { [key: string]: any } = {
      messages,
      model: api_configuration.model
    }

    const is_openai = provider.base_url == PROVIDERS.OpenAI.base_url
    if (is_openai) {
      body.prompt_cache_options = { mode: 'explicit' }
    }

    apply_reasoning_effort({
      body,
      provider,
      reasoning_effort: api_configuration.reasoning_effort
    })

    try {
      let result: { response: string; thoughts?: string } | null = null

      result =
        await prompt_view_provider.prompt_view_api_calls_manager.send_llm_message(
          {
            base_url: provider.base_url,
            api_key: provider.api_key,
            body,
            provider_name: api_configuration.provider_name,
            model: api_configuration.model,
            reasoning_effort: api_configuration.reasoning_effort,
            raw_instructions: current_instructions
          }
        )

      if (result) {
        const recent_api_configuration = {
          provider: api_configuration.provider_name,
          model: api_configuration.model,
          reasoning_effort: api_configuration.reasoning_effort
        }

        if (prompt_type == 'edit-files') {
          vscode.commands.executeCommand('codeWebChat.applyResponse', {
            response: result.response,
            raw_instructions: current_instructions,
            edit_format,
            recent_api_configuration
          })
        }
        return
      } else {
        show_quick_pick = true
        current_api_configuration_id = undefined
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        return
      }
      Logger.error({
        function_name: 'handle_make_api_call',
        message: `${prompt_type} task error`,
        data: error
      })
      if (!error_occurred) {
        const err_msg = t('common.error.edit-files-error')
        vscode.window.showErrorMessage(err_msg)
        error_occurred = true
      }
      return
    }
  }
}
