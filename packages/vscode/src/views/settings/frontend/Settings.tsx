import { useState, useEffect, useMemo } from 'react'
import { use_settings } from './hooks/use-settings'
import { post_message } from './utils/post_message'
import { BackendMessage } from '../types/messages'
import { Home } from './Home/Home'

type NavItem =
  | 'general'
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

const vscode = acquireVsCodeApi()

export const Settings = () => {
  const settings_hook = use_settings(vscode)
  const [scroll_to_section_on_load, set_scroll_to_section_on_load] =
    useState<NavItem>()

  const all_data_loaded = useMemo(() => {
    return (
      settings_hook.providers !== undefined &&
      settings_hook.code_completions_configs !== undefined &&
      settings_hook.commit_messages_configs !== undefined &&
      settings_hook.edit_context_configs !== undefined &&
      settings_hook.intelligent_update_configs !== undefined &&
      settings_hook.commit_message_instructions !== undefined
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
      code_completions_configs={settings_hook.code_completions_configs!}
      commit_messages_configs={settings_hook.commit_messages_configs!}
      edit_context_configs={settings_hook.edit_context_configs!}
      intelligent_update_configs={settings_hook.intelligent_update_configs!}
      commit_message_instructions={settings_hook.commit_message_instructions!}
      set_providers={settings_hook.set_providers}
      set_code_completions_configs={settings_hook.set_code_completions_configs}
      set_commit_messages_configs={settings_hook.set_commit_messages_configs}
      set_edit_context_configs={settings_hook.set_edit_context_configs}
      set_intelligent_update_configs={
        settings_hook.set_intelligent_update_configs
      }
      on_commit_instructions_change={
        settings_hook.handle_commit_instructions_change
      }
      on_open_editor_settings={settings_hook.handle_open_editor_settings}
      on_reorder_providers={settings_hook.handle_reorder_providers}
      on_add_provider={settings_hook.handle_add_provider}
      on_delete_provider={settings_hook.handle_delete_provider}
      on_rename_provider={settings_hook.handle_rename_provider}
      on_change_api_key={settings_hook.handle_change_api_key}
      on_add_config={settings_hook.handle_add_config}
      on_reorder_configs={settings_hook.handle_reorder_configs}
      on_edit_config={settings_hook.handle_edit_config}
      on_delete_config={settings_hook.handle_delete_config}
      on_set_default_config={settings_hook.handle_set_default_config}
      on_unset_default_config={settings_hook.handle_unset_default_config}
      scroll_to_section_on_load={scroll_to_section_on_load}
    />
  )
}
