import { useEffect, useState } from 'react'
import {
  BackendMessage,
  EditFormatInstructions,
  ApiConfiguration,
  Provider
} from '@/views/settings/types/messages'
import { ApiFeature } from '@/views/shared/types/api-features'
import { post_message } from '../utils/post-message'
import { WebConfiguration } from '@shared/types/web-configuration'

export const use_settings = (vscode: any) => {
  const [providers, set_providers] = useState<Provider[] | undefined>(undefined)
  const [api_configurations, set_api_configurations] = useState<
    ApiConfiguration[] | undefined
  >(undefined)
  const [web_configurations, set_web_configurations] = useState<
    WebConfiguration[] | undefined
  >(undefined)
  const [defaults, set_defaults] = useState<
    Record<ApiFeature, string | null> | undefined
  >(undefined)
  const [commit_message_instructions, set_commit_message_instructions] =
    useState<string | undefined>(undefined)
  const [
    attach_all_prompts_in_commit_messages_by_default,
    set_attach_all_prompts_in_commit_messages_by_default
  ] = useState<boolean | undefined>(undefined)
  const [edit_files_system_instructions, set_edit_files_system_instructions] =
    useState<string | undefined>(undefined)
  const [
    find_relevant_files_instructions,
    set_find_relevant_files_instructions
  ] = useState<string | undefined>(undefined)
  const [context_size_warning_threshold, set_context_size_warning_threshold] =
    useState<number>()
  const [edit_format_instructions, set_edit_format_instructions] = useState<
    EditFormatInstructions | undefined
  >(undefined)
  const [
    are_automatic_checkpoints_disabled,
    set_are_automatic_checkpoints_disabled
  ] = useState<boolean | undefined>(undefined)
  const [checkpoint_lifespan, set_checkpoint_lifespan] = useState<
    number | undefined
  >(undefined)
  const [gemini_user_id, set_gemini_user_id] = useState<
    number | null | undefined
  >(undefined)
  const [ai_studio_user_id, set_ai_studio_user_id] = useState<
    number | null | undefined
  >(undefined)
  const [send_with_shift_enter, set_send_with_shift_enter] = useState<
    boolean | undefined
  >(undefined)
  const [check_new_files, set_check_new_files] = useState<boolean | undefined>(
    undefined
  )
  const [reuse_last_tab, set_reuse_last_tab] = useState<boolean | undefined>(
    undefined
  )
  const [
    clear_checks_in_workspace_behavior,
    set_clear_checks_in_workspace_behavior
  ] = useState<'ignore-open-editors' | 'uncheck-all' | undefined>(undefined)
  const [auto_run_intelligent_update, set_auto_run_intelligent_update] =
    useState<boolean | undefined>(undefined)

  useEffect(() => {
    post_message(vscode, { command: 'GET_MODEL_PROVIDERS' })
    post_message(vscode, { command: 'GET_API_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_WEB_CONFIGURATIONS' })
    post_message(vscode, { command: 'GET_EDIT_FILES_SYSTEM_INSTRUCTIONS' })
    post_message(vscode, { command: 'GET_FIND_RELEVANT_FILES_INSTRUCTIONS' })
    post_message(vscode, { command: 'GET_COMMIT_MESSAGE_INSTRUCTIONS' })
    post_message(vscode, {
      command: 'GET_ATTACH_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
    })
    post_message(vscode, { command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD' })
    post_message(vscode, { command: 'GET_EDIT_FORMAT_INSTRUCTIONS' })
    post_message(vscode, { command: 'GET_ARE_AUTOMATIC_CHECKPOINTS_DISABLED' })
    post_message(vscode, { command: 'GET_CHECKPOINT_LIFESPAN' })
    post_message(vscode, { command: 'GET_GEMINI_USER_ID' })
    post_message(vscode, { command: 'GET_AI_STUDIO_USER_ID' })
    post_message(vscode, { command: 'GET_SEND_WITH_SHIFT_ENTER' })
    post_message(vscode, { command: 'GET_CHECK_NEW_FILES' })
    post_message(vscode, { command: 'GET_REUSE_LAST_TAB' })
    post_message(vscode, { command: 'GET_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR' })
    post_message(vscode, { command: 'GET_AUTO_RUN_INTELLIGENT_UPDATE' })
  }, [vscode])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'MODEL_PROVIDERS') {
        set_providers(message.providers)
      } else if (message.command == 'API_CONFIGURATIONS') {
        set_api_configurations(message.api_configurations)
        set_defaults(message.defaults)
      } else if (message.command == 'WEB_CONFIGURATIONS') {
        set_web_configurations(message.web_configurations)
      } else if (message.command == 'EDIT_FILES_SYSTEM_INSTRUCTIONS') {
        set_edit_files_system_instructions(message.instructions)
      } else if (message.command == 'FIND_RELEVANT_FILES_INSTRUCTIONS') {
        set_find_relevant_files_instructions(message.instructions)
      } else if (message.command == 'COMMIT_MESSAGE_INSTRUCTIONS') {
        set_commit_message_instructions(message.instructions)
      } else if (
        message.command == 'ATTACH_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
      ) {
        set_attach_all_prompts_in_commit_messages_by_default(message.enabled)
      } else if (message.command == 'CONTEXT_SIZE_WARNING_THRESHOLD') {
        set_context_size_warning_threshold(message.threshold)
      } else if (message.command == 'EDIT_FORMAT_INSTRUCTIONS') {
        set_edit_format_instructions(message.instructions)
      } else if (message.command == 'ARE_AUTOMATIC_CHECKPOINTS_DISABLED') {
        set_are_automatic_checkpoints_disabled(message.disabled)
      } else if (message.command == 'CHECKPOINT_LIFESPAN') {
        set_checkpoint_lifespan(message.hours)
      } else if (message.command == 'GEMINI_USER_ID') {
        set_gemini_user_id(message.geminiUserId)
      } else if (message.command == 'AI_STUDIO_USER_ID') {
        set_ai_studio_user_id(message.aiStudioUserId)
      } else if (message.command == 'SEND_WITH_SHIFT_ENTER') {
        set_send_with_shift_enter(message.enabled)
      } else if (message.command == 'CHECK_NEW_FILES') {
        set_check_new_files(message.enabled)
      } else if (message.command == 'REUSE_LAST_TAB') {
        set_reuse_last_tab(message.enabled)
      } else if (message.command == 'CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR') {
        set_clear_checks_in_workspace_behavior(message.value)
      } else if (message.command == 'AUTO_RUN_INTELLIGENT_UPDATE') {
        set_auto_run_intelligent_update(message.enabled)
      }
    }

    window.addEventListener('message', handle_message)

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  const handle_reorder_providers = (reordered_providers: Provider[]) => {
    set_providers(reordered_providers)
    post_message(vscode, {
      command: 'REORDER_MODEL_PROVIDERS',
      providers: reordered_providers
    })
  }

  const handle_add_provider = (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => {
    post_message(vscode, {
      command: 'ADD_MODEL_PROVIDER',
      insertion_index: params?.insertion_index,
      create_on_top: params?.create_on_top
    })
  }

  const handle_delete_provider = (provider_name: string) => {
    post_message(vscode, {
      command: 'DELETE_MODEL_PROVIDER',
      provider_name
    })
  }

  const handle_set_default_api_configuration = (
    api_feature: ApiFeature,
    api_configuration_id: string | null
  ) => {
    if (defaults) {
      set_defaults({ ...defaults, [api_feature]: api_configuration_id })
    }
    post_message(vscode, {
      command: 'SET_DEFAULT_API_CONFIGURATION',
      api_feature,
      api_configuration_id
    })
  }

  const handle_select_default_api_configuration = (api_feature: ApiFeature) => {
    post_message(vscode, {
      command: 'SELECT_DEFAULT_API_CONFIGURATION',
      api_feature
    })
  }

  const handle_reorder_api_configurations = (reordered: ApiConfiguration[]) => {
    set_api_configurations(reordered)
    post_message(vscode, {
      command: 'REORDER_API_CONFIGURATIONS',
      api_configurations: reordered
    })
  }

  const handle_add_api_configuration = (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => {
    post_message(vscode, {
      command: 'CREATE_API_CONFIGURATION',
      insertion_index: params?.insertion_index,
      create_on_top: params?.create_on_top
    })
  }

  const handle_delete_api_configuration = (id: string) => {
    post_message(vscode, {
      command: 'DELETE_API_CONFIGURATION',
      api_configuration_id: id
    })
  }

  const handle_reorder_web_configurations = (reordered: WebConfiguration[]) => {
    post_message(vscode, {
      command: 'REORDER_WEB_CONFIGURATIONS',
      web_configurations: reordered
    })
  }

  const handle_add_web_configuration = (params?: {
    insertion_index?: number
    create_on_top?: boolean
  }) => {
    post_message(vscode, {
      command: 'CREATE_WEB_CONFIGURATION',
      insertion_index: params?.insertion_index,
      create_on_top: params?.create_on_top
    })
  }

  const handle_delete_web_configuration = (name: string) => {
    post_message(vscode, {
      command: 'DELETE_WEB_CONFIGURATION',
      name
    })
  }

  const handle_commit_instructions_change = (instructions: string) =>
    post_message(vscode, {
      command: 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS',
      instructions
    })

  const handle_attach_all_prompts_in_commit_messages_by_default_change = (
    enabled: boolean
  ) => {
    set_attach_all_prompts_in_commit_messages_by_default(enabled)
    post_message(vscode, {
      command: 'UPDATE_ATTACH_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT',
      enabled
    })
  }

  const handle_edit_files_system_instructions_change = (instructions: string) =>
    post_message(vscode, {
      command: 'UPDATE_EDIT_FILES_SYSTEM_INSTRUCTIONS',
      instructions
    })

  const handle_find_relevant_files_instructions_change = (
    instructions: string
  ) =>
    post_message(vscode, {
      command: 'UPDATE_FIND_RELEVANT_FILES_INSTRUCTIONS',
      instructions
    })

  const handle_open_editor_settings = () =>
    post_message(vscode, { command: 'OPEN_EDITOR_SETTINGS' })

  const handle_open_ignore_patterns_settings = () =>
    post_message(vscode, { command: 'OPEN_IGNORE_PATTERNS_SETTINGS' })

  const handle_open_allow_patterns_settings = () =>
    post_message(vscode, { command: 'OPEN_ALLOW_PATTERNS_SETTINGS' })

  const handle_context_size_warning_threshold_change = (
    threshold: number | undefined
  ) =>
    post_message(vscode, {
      command: 'UPDATE_CONTEXT_SIZE_WARNING_THRESHOLD',
      threshold: threshold ?? null
    })

  const handle_edit_format_instructions_change = (
    instructions: EditFormatInstructions
  ) =>
    post_message(vscode, {
      command: 'UPDATE_EDIT_FORMAT_INSTRUCTIONS',
      instructions
    })

  const handle_automatic_checkpoints_toggle = (disabled: boolean) => {
    set_are_automatic_checkpoints_disabled(disabled)
    post_message(vscode, {
      command: 'UPDATE_ARE_AUTOMATIC_CHECKPOINTS_DISABLED',
      disabled
    })
  }

  const handle_checkpoint_lifespan_change = (hours: number | undefined) =>
    post_message(vscode, {
      command: 'UPDATE_CHECKPOINT_LIFESPAN',
      hours: hours ?? null
    })

  const handle_gemini_user_id_change = (geminiUserId: number | null) =>
    post_message(vscode, {
      command: 'UPDATE_GEMINI_USER_ID',
      geminiUserId
    })

  const handle_ai_studio_user_id_change = (aiStudioUserId: number | null) =>
    post_message(vscode, {
      command: 'UPDATE_AI_STUDIO_USER_ID',
      aiStudioUserId
    })

  const handle_send_with_shift_enter_change = (enabled: boolean) => {
    set_send_with_shift_enter(enabled)
    post_message(vscode, {
      command: 'UPDATE_SEND_WITH_SHIFT_ENTER',
      enabled
    })
  }

  const handle_check_new_files_change = (enabled: boolean) => {
    set_check_new_files(enabled)
    post_message(vscode, {
      command: 'UPDATE_CHECK_NEW_FILES',
      enabled
    })
  }

  const handle_reuse_last_tab_change = (enabled: boolean) => {
    set_reuse_last_tab(enabled)
    post_message(vscode, {
      command: 'UPDATE_REUSE_LAST_TAB',
      enabled
    })
  }

  const handle_clear_checks_in_workspace_behavior_change = (
    value: 'ignore-open-editors' | 'uncheck-all'
  ) => {
    set_clear_checks_in_workspace_behavior(value)
    post_message(vscode, {
      command: 'UPDATE_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR',
      value
    })
  }

  const handle_auto_run_intelligent_update_change = (enabled: boolean) => {
    set_auto_run_intelligent_update(enabled)
    post_message(vscode, {
      command: 'UPDATE_AUTO_RUN_INTELLIGENT_UPDATE',
      enabled
    })
  }

  const handle_open_keybindings = (search?: string) => {
    post_message(vscode, {
      command: 'OPEN_KEYBINDINGS',
      search
    })
  }

  const handle_open_external_url = (url: string) => {
    post_message(vscode, {
      command: 'OPEN_EXTERNAL_URL',
      url
    })
  }

  return {
    providers,
    set_providers,
    api_configurations,
    set_api_configurations,
    web_configurations,
    set_web_configurations,
    defaults,
    commit_message_instructions,
    attach_all_prompts_in_commit_messages_by_default,
    edit_files_system_instructions,
    find_relevant_files_instructions,
    context_size_warning_threshold,
    edit_format_instructions,
    are_automatic_checkpoints_disabled,
    checkpoint_lifespan,
    gemini_user_id,
    ai_studio_user_id,
    send_with_shift_enter,
    check_new_files,
    reuse_last_tab,
    clear_checks_in_workspace_behavior,
    auto_run_intelligent_update,
    handle_reorder_providers,
    handle_add_provider,
    handle_delete_provider,
    handle_set_default_api_configuration,
    handle_select_default_api_configuration,
    handle_reorder_api_configurations,
    handle_add_api_configuration,
    handle_delete_api_configuration,
    handle_reorder_web_configurations,
    handle_add_web_configuration,
    handle_delete_web_configuration,
    handle_commit_instructions_change,
    handle_attach_all_prompts_in_commit_messages_by_default_change,
    handle_edit_files_system_instructions_change,
    handle_find_relevant_files_instructions_change,
    handle_open_editor_settings,
    handle_open_ignore_patterns_settings,
    handle_open_allow_patterns_settings,
    handle_context_size_warning_threshold_change,
    handle_edit_format_instructions_change,
    handle_automatic_checkpoints_toggle,
    handle_checkpoint_lifespan_change,
    handle_gemini_user_id_change,
    handle_ai_studio_user_id_change,
    handle_send_with_shift_enter_change,
    handle_check_new_files_change,
    handle_reuse_last_tab_change,
    handle_clear_checks_in_workspace_behavior_change,
    handle_auto_run_intelligent_update_change,
    handle_open_keybindings,
    handle_open_external_url
  }
}
