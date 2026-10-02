import * as vscode from 'vscode'
import { t } from '@/i18n'
import { build_prompt_payload } from './utils/build-prompt-payload'
import { Logger } from '@shared/utils/logger'
import { ProvidersManager } from '@/services/providers-manager'
import axios from 'axios'
import { LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { MakeApiCallMessage } from '@/views/prompt/types/messages'
import { build_user_content } from '@/utils/build-user-content'
import { PromptBuilder } from '@/utils/prompt-builder'
import { ApiPromptType } from '@shared/types/prompt-types'
import {
  EDIT_FORMAT_INSTRUCTIONS_DIFF,
  EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE,
  EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
  EDIT_FORMAT_INSTRUCTIONS_WHOLE
} from '@/constants/edit-format-instructions'
import { PROVIDERS } from '@/constants/providers'
import { get_api_configuration } from '@/utils/get-api-configuration'
import { show_incomplete_setup_warning } from '@/utils/show-missing-configuration-notification'

export const handle_make_api_call = async (
  prompt_view_provider: PromptViewProvider,
  message: MakeApiCallMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const prompt_type = prompt_view_provider.prompt_type as ApiPromptType
  const providers_manager = new ProvidersManager(
    prompt_view_provider.extension_context
  )

  const api_configurations = await providers_manager.get_api_configurations()

  if (!api_configurations.length) {
    show_incomplete_setup_warning('api')
    return
  }

  const current_instructions = prompt_view_provider.current_instructions.trim()

  if (!current_instructions) {
    vscode.window.showWarningMessage(
      t('views.common.handlers.common.instructions-cannot-be-empty')
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
    vscode.window.showWarningMessage(
      t('views.common.handlers.common.context-cannot-be-empty')
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
      prompt_type,
      last_used_state_key: LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY,
      caller_name: 'handle_make_api_call'
    })

    if (!api_configuration_result || api_configuration_result === 'back') {
      return
    }

    prompt_view_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { provider, api_configuration } = api_configuration_result

    let edit_format: EditFormat = 'whole'
    let system_instructions = ''
    let user_content = ''

    if (prompt_type == 'edit') {
      edit_format = prompt_view_provider.edit_format
      const output_formatting = {
        whole: EDIT_FORMAT_INSTRUCTIONS_WHOLE,
        truncated: EDIT_FORMAT_INSTRUCTIONS_TRUNCATED,
        diff: EDIT_FORMAT_INSTRUCTIONS_DIFF,
        'search-replace': EDIT_FORMAT_INSTRUCTIONS_SEARCH_REPLACE
      }[edit_format]

      const config = vscode.workspace.getConfiguration('codeWebChat')
      system_instructions =
        config.get<string>('editFilesSystemInstructions') ||
        config.inspect<string>('editFilesSystemInstructions')?.defaultValue ||
        ''

      const { part1, part2 } = PromptBuilder.build_prompt({
        files_context_part1: other_files,
        files_context_part2: recent_files,
        skill_definitions,
        output_formatting,
        user_instructions: processed_instructions
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

        if (prompt_type == 'edit') {
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
