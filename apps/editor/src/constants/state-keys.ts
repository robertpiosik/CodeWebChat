export const LAST_APPLIED_CHANGES_STATE_KEY = 'last-applied-changes-state'
export const LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY =
  'last-applied-changes-editor-state'
export const LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY =
  'last-applied-clipboard-content'
export const QUICK_SAVES_STATE_KEY = 'quick-saves'
export const LAST_CONTEXT_SAVE_LOCATION_STATE_KEY = 'last-save-location'
export const RANGES_STATE_KEY = 'ranges'
export const LAST_RANGE_SAVE_LOCATION_STATE_KEY = 'last-range-save-location'
export const LAST_APPLY_CONTEXT_OPTION_STATE_KEY = 'last-apply-context-option'
export const CONTEXT_CHECKED_PATHS_STATE_KEY = 'context-checked-paths'
export const CONTEXT_CHECKED_TIMESTAMPS_STATE_KEY = 'context-checked-timestamps'
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
export const PANEL_MODE_STATE_KEY = 'panel-mode'

export const INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY = 'instructions-edit-context'
export const INSTRUCTIONS_ASK_STATE_KEY = 'instructions-ask'
export const INSTRUCTIONS_NO_CONTEXT_STATE_KEY = 'instructions-no-context'
export const INSTRUCTIONS_CODE_AT_CURSOR_STATE_KEY =
  'instructions-code-at-cursor'
export const INSTRUCTIONS_PRUNE_CONTEXT_STATE_KEY = 'instructions-prune-context'

export const ARE_TASKS_COLLAPSED_STATE_KEY = 'are-tasks-collapsed'
export const IS_TIMELINE_COLLAPSED_STATE_KEY = 'is-timeline-collapsed'

export const HISTORY_ASK_STATE_KEY = 'history-ask'
export const HISTORY_EDIT_STATE_KEY = 'history-edit'
export const HISTORY_CODE_AT_CURSOR_STATE_KEY = 'history-code-at-cursor'
export const HISTORY_PRUNE_CONTEXT_STATE_KEY = 'history-prune-context'
export const HISTORY_NO_CONTEXT_STATE_KEY = 'history-no-context'

export const RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY =
  'recently-used-code-at-cursor-config-ids'
export const RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY =
  'recently-used-prune-context-config-ids'
export const RECENTLY_USED_EDIT_CONTEXT_CONFIG_IDS_STATE_KEY =
  'recently-used-edit-context-config-ids'
export const RECENTLY_USED_COMMIT_MESSAGES_CONFIG_IDS_STATE_KEY =
  'recently-used-commit-messages-config-ids'
export const RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY =
  'recently-used-intelligent-update-config-ids'

export const get_presets_collapsed_state_key = (web_prompt_type: string) =>
  `presets-collapsed-${web_prompt_type}`
export const get_configurations_collapsed_state_key = (
  api_prompt_type: string
) => `configurations-collapsed-${api_prompt_type}`

export const get_recently_used_presets_or_groups_key = (
  web_prompt_type: string
) => `recently-used-presets-or-groups-${web_prompt_type}`

export const LAST_SELECTED_BROWSER_ID_STATE_KEY = 'last-selected-browser-id'

export type DuplicateWorkspaceContext = {
  checked_files: string[]
  checked_files_timestamps?: Record<string, number>
  timestamp: number
  workspace_root_folders: string[]
  open_editors?: { path: string; view_column?: number }[]
  ranges?: Record<string, string>
}

export type HistoryEntry = {
  text: string
  createdAt: number
}
