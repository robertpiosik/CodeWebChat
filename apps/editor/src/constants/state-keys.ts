export const LAST_APPLIED_CHANGES_STATE_KEY = 'last-applied-changes-state'
export const LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY =
  'last-applied-changes-editor-state'
export const LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY =
  'last-applied-clipboard-content'
export const QUICK_SAVES_STATE_KEY = 'quick-saves'
export const LAST_CONTEXT_SAVE_LOCATION_STATE_KEY = 'last-save-location'
export const RANGES_STATE_KEY = 'ranges'
export const LAST_RANGES_SAVE_LOCATION_STATE_KEY = 'last-ranges-save-location'
export const LAST_APPLY_CONTEXT_OPTION_STATE_KEY = 'last-apply-context-option'
export const CONTEXT_CHECKED_PATHS_STATE_KEY = 'context-checked-paths'
export const CONTEXT_CHECKED_TIMESTAMPS_STATE_KEY = 'context-checked-timestamps'
export const LAST_APPLY_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY =
  'last-apply-context-merge-replace-option'
export const LAST_FIND_RELEVANT_FILES_MERGE_REPLACE_OPTION_STATE_KEY =
  'last-find-relevant-files-merge-replace-option'
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

export const CHATS_VIEW_CHAT_HISTORY_STATE_KEY = 'chats-view-chat-history'

export const DUPLICATE_WORKSPACE_CONTEXT_STATE_KEY =
  'duplicate-workspace-context'

export const EDIT_FORMAT_STATE_KEY = 'edit-format'
export const WEB_MODE_STATE_KEY = 'web-mode'
export const API_MODE_STATE_KEY = 'api-mode'
export const PROMPT_VIEW_MODE_STATE_KEY = 'prompt-view-mode'

export const INSTRUCTIONS_EDIT_FILES_STATE_KEY = 'instructions-edit-files'
export const INSTRUCTIONS_ASK_STATE_KEY = 'instructions-ask'
export const INSTRUCTIONS_NO_CONTEXT_STATE_KEY = 'instructions-no-context'
export const INSTRUCTIONS_CODE_AT_CURSOR_STATE_KEY =
  'instructions-code-at-cursor'
export const INSTRUCTIONS_FIND_RELEVANT_FILES_STATE_KEY =
  'instructions-find-relevant-files'

export const ARE_TASKS_COLLAPSED_STATE_KEY = 'are-tasks-collapsed'
export const ARE_CHECKPOINTS_COLLAPSED_STATE_KEY = 'are-checkpoints-collapsed'

export const HISTORY_ASK_ABOUT_FILES_STATE_KEY = 'history-ask-about-files'
export const HISTORY_EDIT_FILES_STATE_KEY = 'history-edit-files'
export const HISTORY_CODE_AT_CURSOR_STATE_KEY = 'history-code-at-cursor'
export const HISTORY_FIND_RELEVANT_FILES_STATE_KEY =
  'history-find-relevant-files'
export const HISTORY_WITHOUT_FILES_STATE_KEY = 'history-without-files'

export const FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE_STATE_KEY =
  'find-relevant-files-shrink-source-code'

export const LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY =
  'last-used-code-at-cursor-config-id'
export const LAST_USED_FIND_RELEVANT_FILES_CONFIG_ID_STATE_KEY =
  'last-used-find-relevant-files-config-id'
export const LAST_USED_EDIT_FILES_CONFIG_ID_STATE_KEY =
  'last-used-edit-files-config-id'
export const LAST_USED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY =
  'last-used-commit-messages-config-id'
export const LAST_USED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY =
  'last-used-intelligent-update-config-id'
export const LAST_USED_VOICE_INPUT_CONFIG_ID_STATE_KEY =
  'last-used-voice-input-config-id'

export const WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY =
  'web-configurations-collapsed'
export const API_CONFIGURATIONS_COLLAPSED_STATE_KEY =
  'api-configurations-collapsed'

export const get_last_used_web_configuration_key = (web_prompt_type: string) =>
  `last-used-web-configuration-${web_prompt_type}`

export const LAST_SELECTED_BROWSER_ID_STATE_KEY = 'last-selected-browser-id'

export const LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY =
  'last-search-files-phrase-query'
export const LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY =
  'last-search-files-keywords-query'
export const LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY =
  'last-search-files-keywords-match-mode'
export const LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY =
  'last-search-files-keywords-target'
export const LAST_SEARCH_FILES_FILENAME_QUERY_STATE_KEY =
  'last-search-files-filename-query'
export const LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY =
  'last-search-files-filename-match-mode'
export const LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY =
  'last-search-files-intelligent-query'
export const LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY =
  'last-search-files-semantic-query'

export const LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY =
  'last-search-files-for-context-mode'

export const LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY =
  'last-find-relevant-files-query'
export const LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY =
  'last-find-relevant-files-shrink'

export type DuplicateWorkspaceContext = {
  checked_files: string[]
  checked_files_timestamps: Record<string, number>
  timestamp: number
  workspace_root_folders: string[]
  open_editors?: { path: string; view_column?: number }[]
  ranges?: Record<string, string>
}

export type HistoryEntry = {
  text: string
  createdAt: number
}
