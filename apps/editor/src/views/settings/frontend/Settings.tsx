import { useState, useEffect, useMemo } from 'react'
import { use_settings } from './hooks/use-settings'
import { post_message } from './utils/post-message'
import { BackendMessage } from '../types/messages'
import { Home, NavItem } from './Home/Home'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const settings_hook = use_settings(vscode)
  const [scroll_to_section_on_load, set_scroll_to_section_on_load] =
    useState<NavItem>()

  const all_data_loaded = useMemo(() => {
    return (
      settings_hook.providers !== undefined &&
      settings_hook.api_configurations !== undefined &&
      settings_hook.web_configurations !== undefined &&
      settings_hook.defaults !== undefined &&
      settings_hook.edit_context_system_instructions !== undefined &&
      settings_hook.voice_input_instructions !== undefined &&
      settings_hook.voice_input_push_to_talk !== undefined &&
      settings_hook.commit_message_instructions !== undefined &&
      settings_hook.include_prompts_in_commit_messages !== undefined &&
      settings_hook.context_size_warning_threshold !== undefined &&
      settings_hook.edit_format_instructions !== undefined &&
      settings_hook.are_automatic_checkpoints_disabled !== undefined &&
      settings_hook.checkpoint_lifespan !== undefined &&
      settings_hook.gemini_user_id !== undefined &&
      settings_hook.ai_studio_user_id !== undefined &&
      settings_hook.send_with_shift_enter !== undefined &&
      settings_hook.check_new_files !== undefined &&
      settings_hook.reuse_last_tab !== undefined &&
      settings_hook.clear_checks_in_workspace_behavior !== undefined &&
      settings_hook.auto_run_intelligent_update !== undefined &&
      settings_hook.extended_cache_duration_for_anthropic !== undefined
    )
  }, [settings_hook])

  useEffect(() => {
    if (!all_data_loaded) return
    post_message(vscode, { command: 'SETTINGS_UI_READY' })
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command == 'SHOW_SECTION') {
        set_scroll_to_section_on_load(event.data.section as NavItem)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [all_data_loaded])

  if (!all_data_loaded) return null

  return (
    <Home
      providers={settings_hook.providers!}
      api_configurations={settings_hook.api_configurations!}
      defaults={settings_hook.defaults!}
      edit_context_system_instructions={
        settings_hook.edit_context_system_instructions!
      }
      context_size_warning_threshold={
        settings_hook.context_size_warning_threshold!
      }
      include_prompts_in_commit_messages={
        settings_hook.include_prompts_in_commit_messages!
      }
      voice_input_instructions={settings_hook.voice_input_instructions!}
      voice_input_push_to_talk={settings_hook.voice_input_push_to_talk!}
      commit_message_instructions={settings_hook.commit_message_instructions!}
      edit_format_instructions={settings_hook.edit_format_instructions!}
      are_automatic_checkpoints_disabled={
        settings_hook.are_automatic_checkpoints_disabled!
      }
      checkpoint_lifespan={settings_hook.checkpoint_lifespan!}
      gemini_user_id={settings_hook.gemini_user_id!}
      ai_studio_user_id={settings_hook.ai_studio_user_id!}
      send_with_shift_enter={settings_hook.send_with_shift_enter!}
      check_new_files={settings_hook.check_new_files!}
      reuse_last_tab={settings_hook.reuse_last_tab!}
      clear_checks_in_workspace_behavior={
        settings_hook.clear_checks_in_workspace_behavior!
      }
      extended_cache_duration_for_anthropic={
        settings_hook.extended_cache_duration_for_anthropic!
      }
      auto_run_intelligent_update={settings_hook.auto_run_intelligent_update!}
      set_providers={settings_hook.set_providers}
      set_api_configurations={settings_hook.set_api_configurations}
      on_context_size_warning_threshold_change={
        settings_hook.handle_context_size_warning_threshold_change
      }
      on_voice_input_instructions_change={
        settings_hook.handle_voice_input_instructions_change
      }
      on_voice_input_push_to_talk_change={
        settings_hook.handle_voice_input_push_to_talk_change
      }
      on_commit_instructions_change={
        settings_hook.handle_commit_instructions_change
      }
      on_include_prompts_in_commit_messages_change={
        settings_hook.handle_include_prompts_in_commit_messages_change
      }
      on_edit_context_system_instructions_change={
        settings_hook.handle_edit_context_system_instructions_change
      }
      on_edit_format_instructions_change={
        settings_hook.handle_edit_format_instructions_change
      }
      on_automatic_checkpoints_toggle={
        settings_hook.handle_automatic_checkpoints_toggle
      }
      on_checkpoint_lifespan_change={
        settings_hook.handle_checkpoint_lifespan_change
      }
      on_clear_checks_in_workspace_behavior_change={
        settings_hook.handle_clear_checks_in_workspace_behavior_change
      }
      on_gemini_user_id_change={settings_hook.handle_gemini_user_id_change}
      on_ai_studio_user_id_change={
        settings_hook.handle_ai_studio_user_id_change
      }
      on_send_with_shift_enter_change={
        settings_hook.handle_send_with_shift_enter_change
      }
      on_check_new_files_change={settings_hook.handle_check_new_files_change}
      on_reuse_last_tab_change={settings_hook.handle_reuse_last_tab_change}
      on_auto_run_intelligent_update_change={
        settings_hook.handle_auto_run_intelligent_update_change
      }
      on_extended_cache_duration_for_anthropic_change={
        settings_hook.handle_extended_cache_duration_for_anthropic_change
      }
      on_open_keybindings={settings_hook.handle_open_keybindings}
      on_open_editor_settings={settings_hook.handle_open_editor_settings}
      on_open_ignore_patterns_settings={
        settings_hook.handle_open_ignore_patterns_settings
      }
      on_open_allow_patterns_settings={
        settings_hook.handle_open_allow_patterns_settings
      }
      on_reorder_providers={settings_hook.handle_reorder_providers}
      on_add_provider={settings_hook.handle_add_provider}
      on_delete_provider={settings_hook.handle_delete_provider}
      on_edit_provider={settings_hook.handle_edit_provider}
      on_add_api_configuration={settings_hook.handle_add_api_configuration}
      on_reorder_api_configurations={settings_hook.handle_reorder_api_configurations}
      on_edit_api_configuration={settings_hook.handle_edit_api_configuration}
      on_duplicate_api_configuration={settings_hook.handle_duplicate_api_configuration}
      on_delete_api_configuration={settings_hook.handle_delete_api_configuration}
      on_set_default_api_configuration={settings_hook.handle_set_default_api_configuration}
      on_select_default_api_configuration={settings_hook.handle_select_default_api_configuration}
      web_configurations={settings_hook.web_configurations!}
      set_web_configurations={settings_hook.set_web_configurations}
      on_reorder_web_configurations={settings_hook.handle_reorder_web_configurations}
      on_add_web_configuration={settings_hook.handle_add_web_configuration}
      on_duplicate_web_configuration={settings_hook.handle_duplicate_web_configuration}
      on_edit_web_configuration={settings_hook.handle_edit_web_configuration}
      on_delete_web_configuration={settings_hook.handle_delete_web_configuration}
      on_open_external_url={settings_hook.handle_open_external_url}
      scroll_to_section_on_load={scroll_to_section_on_load}
    />
  )
}
