import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '@/views/panel/types/messages'
import { ToolType } from '@/views/settings/types/tools'

export const update_api_configuration = async (params: {
  context: vscode.ExtensionContext
  updating_api_configuration: ApiConfiguration
  updated_api_configuration: ApiConfiguration
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
  tool_type?: ToolType
}): Promise<{ success: boolean; has_changes: boolean; new_id?: string }> => {
  const providers_manager = new ModelProvidersManager(params.context)

  if (params.is_new && params.origin === 'cancel') {
    return { success: true, has_changes: false }
  }

  const api_configurations = await providers_manager.get_api_configurations()

  let api_configuration_index = -1
  if (!params.is_new) {
    api_configuration_index = api_configurations.findIndex(
      (p) => get_api_configuration_id(p) == params.updating_api_configuration.id
    )

    if (api_configuration_index == -1 && params.origin != 'cancel') {
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
          'API configuration',
          params.updating_api_configuration.id
        )
      )
      return { success: false, has_changes: false }
    }
  }

  const has_changes =
    params.updating_api_configuration.id !==
      get_api_configuration_id(params.updated_api_configuration) ||
    params.updating_api_configuration.system_instructions_override !==
      params.updated_api_configuration.system_instructions_override ||
    params.updating_api_configuration.is_pinned !==
      params.updated_api_configuration.is_pinned

  if (!has_changes && !params.is_new) {
    return { success: true, has_changes: false }
  }

  if (params.origin == 'cancel') {
    const save_changes_button = 'Save'
    const result = await vscode.window.showWarningMessage(
      dictionary.information_message.CONFIRM_SAVE_CHANGES_TO_ITEM(
        'API configuration'
      ),
      {
        modal: true,
        detail:
          dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
            'API configuration'
          )
      },
      save_changes_button
    )

    if (result != save_changes_button) {
      return { success: true, has_changes: false }
    }
  }

  const new_config = {
    ...(!params.is_new && api_configuration_index !== -1
      ? api_configurations[api_configuration_index]
      : {}),
    model_provider_name: params.updated_api_configuration.model_provider_name,
    model: params.updated_api_configuration.model,
    temperature: params.updated_api_configuration.temperature,
    reasoning_effort: params.updated_api_configuration.reasoning_effort,
    system_instructions_override:
      params.updated_api_configuration.system_instructions_override,
    is_pinned: params.updated_api_configuration.is_pinned
  }

  const new_id = get_api_configuration_id(new_config as any)

  const is_duplicate = params.is_new
    ? api_configurations.some((c) => get_api_configuration_id(c) === new_id)
    : new_id != params.updating_api_configuration.id &&
      api_configurations.some((c) => get_api_configuration_id(c) === new_id)

  if (is_duplicate) {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      dictionary.error_message.CONFIGURATION_ALREADY_EXISTS,
      { modal: true },
      discard_button
    )

    if (result == discard_button) {
      return { success: true, has_changes: false }
    }

    return { success: false, has_changes: true }
  }

  if (params.is_new) {
    if (params.insertion_index !== undefined) {
      api_configurations.splice(params.insertion_index, 0, new_config as any)
    } else {
      api_configurations.push(new_config as any)
    }
  } else if (api_configuration_index !== -1) {
    api_configurations[api_configuration_index] = new_config as any
  }

  await providers_manager.save_api_configurations(api_configurations)

  if (params.is_new && params.tool_type) {
    if (params.tool_type == 'code-at-cursor') {
      await providers_manager.set_default_code_completions_api_configuration(
        new_config as any
      )
    } else if (params.tool_type == 'commit-messages') {
      await providers_manager.set_default_commit_messages_api_configuration(
        new_config as any
      )
    } else if (params.tool_type == 'intelligent-update') {
      await providers_manager.set_default_intelligent_update_api_configuration(
        new_config as any
      )
    } else if (params.tool_type == 'find-relevant-files') {
      await providers_manager.set_default_find_relevant_files_api_configuration(
        new_config as any
      )
    } else if (params.tool_type == 'voice-input') {
      await providers_manager.set_default_voice_input_api_configuration(
        new_config as any
      )
    }
  }

  return {
    success: true,
    has_changes: true,
    new_id
  }
}
