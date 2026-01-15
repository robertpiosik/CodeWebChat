// Note: Use kebab-case for new keys
export const LAST_APPLIED_CHANGES_STATE_KEY = 'last-applied-changes-state'
export const LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY =
  'last-applied-changes-editor-state'
export const LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY =
  'last-applied-clipboard-content'
export const QUICK_SAVES_STATE_KEY = 'quick-saves'
export const LAST_CONTEXT_SAVE_LOCATION_STATE_KEY = 'lastSaveLocation'
export const RANGES_STATE_KEY = 'ranges'
export const LAST_RANGE_SAVE_LOCATION_STATE_KEY = 'last-range-save-location'
export const LAST_APPLY_CONTEXT_OPTION_STATE_KEY = 'last-apply-context-option'
export const CONTEXT_CHECKED_PATHS_STATE_KEY = 'context-checked-paths'
export const CONTEXT_CHECKED_URLS_STATE_KEY = 'context-checked-urls'
export const CONTEXT_CHECKED_TIMESTAMPS_STATE_KEY = 'context-checked-timestamps'
export const LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY =
  'lastSelectedCodeCompletionConfigId'
export const LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY =
  'lastSelectedEditContextConfigId'
export const LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY =
  'lastSelectedCommitMessagesConfigId'
export const LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY =
  'lastSelectedIntelligentUpdateConfigId'
export const LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY =
  'last-context-merge-replace-option'
export const LAST_REFACTOR_INSTRUCTION_SOURCE_STATE_KEY =
  'last-refactor-instruction-source'
export const LAST_REFACTOR_INSTRUCTION_STATE_KEY = 'last-refactor-instruction'

export const LAST_SELECTED_SYMBOL_STATE_KEY = 'last-selected-symbol'
export const LAST_SELECTED_CONTEXT_SOURCE_IN_SYMBOLS_QUICK_PICK_STATE_KEY =
  'last-selected-context-source-in-symbols-quick-pick'
export const LAST_SELECTED_REPOSITORY_IN_SYMBOLS_QUCK_PICK_STATE_KEY =
  'last-selected-repository-in-symbols-quick-pick'

export const CHECKPOINTS_STATE_KEY = 'checkpoints'
export const TEMPORARY_CHECKPOINT_STATE_KEY = 'temporary-checkpoint'
export const CHECKPOINT_OPERATION_IN_PROGRESS_STATE_KEY =
  'checkpoint-operation-in-progress'

export const DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY =
  'duplicate-workspace-context'

export const CHAT_EDIT_FORMAT_STATE_KEY = 'chat-edit-format'
export const API_EDIT_FORMAT_STATE_KEY = 'api-edit-format'
export const WEB_MODE_STATE_KEY = 'web-mode'
export const API_MODE_STATE_KEY = 'api-mode'

export const INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY = 'instructions-edit-context'
export const INSTRUCTIONS_ASK_STATE_KEY = 'instructions-ask'
export const INSTRUCTIONS_NO_CONTEXT_STATE_KEY = 'instructions-no-context'
export const INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY =
  'instructions-code-completions'

export const ARE_TASKS_COLLAPSED_STATE_KEY = 'are-tasks-collapsed'
export const IS_TIMELINE_COLLAPSED_STATE_KEY = 'is-timeline-collapsed'

export const HISTORY_ASK_STATE_KEY = 'history-ask'
export const HISTORY_EDIT_STATE_KEY = 'history-edit'
export const HISTORY_CODE_COMPLETIONS_STATE_KEY = 'history-code-completions'
export const HISTORY_NO_CONTEXT_STATE_KEY = 'history-no-context'

export const PINNED_HISTORY_ASK_STATE_KEY = 'pinned-history-ask'
export const PINNED_HISTORY_EDIT_STATE_KEY = 'pinned-history-edit'
export const PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY =
  'pinned-history-code-completions'
export const PINNED_HISTORY_NO_CONTEXT_STATE_KEY = 'pinned-history-no-context'

export const RECENTLY_USED_CODE_COMPLETION_CONFIG_IDS_STATE_KEY =
  'recently-used-code-completion-config-ids'
export const RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY =
  'recently-used-edit-context-config-ids'

export const get_presets_collapsed_state_key = (web_prompt_type: string) =>
  `presets-collapsed-${web_prompt_type}`
export const get_configurations_collapsed_state_key = (
  api_prompt_type: string
) => `configurations-collapsed-${api_prompt_type}`

export const get_recently_used_presets_or_groups_key = (
  web_prompt_type: string
) => `recently-used-presets-or-groups-${web_prompt_type}`

export type DuplicateWorkspaceContext = {
  checked_files: string[]
  checked_files_timestamps?: Record<string, number>
  checked_websites: string[]
  timestamp: number
  workspace_root_folders: string[]
  open_editors?: { path: string; view_column?: number }[]
  ranges?: Record<string, string>
}

export type HistoryEntry = {
  text: string
  createdAt: number
}
