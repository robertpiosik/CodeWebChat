// Note: Use kebab-case for new keys
export const LAST_APPLIED_CHANGES_STATE_KEY = 'last-applied-changes-state'
export const LAST_APPLIED_CHANGES_EDITOR_STATE_STATE_KEY =
  'last-applied-changes-editor-state'
export const LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY =
  'last-applied-clipboard-content'
export const SAVED_CONTEXTS_STATE_KEY = 'savedContexts'
export const LAST_CONTEXT_SAVE_LOCATION_STATE_KEY = 'lastSaveLocation'
export const LAST_APPLY_CONTEXT_OPTION_STATE_KEY = 'last-apply-context-option'
export const LAST_SELECTED_WORKSPACE_CONTEXT_NAME_STATE_KEY =
  'last-selected-workspace-context-name'
export const LAST_SELECTED_FILE_CONTEXT_NAME_STATE_KEY =
  'last-selected-file-context-name'
export const CONTEXT_CHECKED_PATHS_STATE_KEY = 'context-checked-paths'
export const CONTEXT_CHECKED_URLS_STATE_KEY = 'context-checked-urls'
export const COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY =
  'commitMessagesConfirmationThreshold'
export const LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY =
  'lastSelectedCodeCompletionConfigId'
export const LAST_SELECTED_EDIT_CONTEXT_CONFIG_ID_STATE_KEY =
  'lastSelectedEditContextConfigId'
export const LAST_SELECTED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY =
  'lastSelectedCommitMessagesConfigId'
export const LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY =
  'lastSelectedIntelligentUpdateConfigId'
export const LAST_CHOSEN_COMMAND_BY_VIEW_TYPE_STATE_KEY =
  'lastChosenCommandByViewType'
export const LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY =
  'last-context-merge-replace-option'
export const LAST_REFACTOR_INSTRUCTION_SOURCE_STATE_KEY =
  'last-refactor-instruction-source'
export const LAST_REFACTOR_INSTRUCTION_STATE_KEY = 'last-refactor-instruction'
export const CHECKPOINTS_STATE_KEY = 'checkpoints'

export const CHAT_EDIT_FORMAT_STATE_KEY = 'chat-edit-format'
export const API_EDIT_FORMAT_STATE_KEY = 'api-edit-format'
export const WEB_MODE_STATE_KEY = 'web-mode'
export const API_MODE_STATE_KEY = 'api-mode'

export const INSTRUCTIONS_EDIT_CONTEXT_STATE_KEY = 'instructions-edit-context'
export const INSTRUCTIONS_ASK_STATE_KEY = 'instructions-ask'
export const INSTRUCTIONS_NO_CONTEXT_STATE_KEY = 'instructions-no-context'
export const INSTRUCTIONS_CODE_COMPLETIONS_STATE_KEY =
  'instructions-code-completions'

export const HISTORY_ASK_STATE_KEY = 'history-ask'
export const HISTORY_EDIT_STATE_KEY = 'history-edit'
export const HISTORY_CODE_COMPLETIONS_STATE_KEY = 'history-code-completions'
export const HISTORY_NO_CONTEXT_STATE_KEY = 'history-no-context'

export const PINNED_HISTORY_ASK_STATE_KEY = 'pinned-history-ask'
export const PINNED_HISTORY_EDIT_STATE_KEY = 'pinned-history-edit'
export const PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY =
  'pinned-history-code-completions'
export const PINNED_HISTORY_NO_CONTEXT_STATE_KEY = 'pinned-history-no-context'

export const RECENT_DONATIONS_VISIBLE_STATE_KEY = 'recent-donations-visible'

export const get_last_group_or_preset_choice_state_key = (web_mode: string) =>
  `last-group-or-preset-choice-${web_mode}`

export const get_last_selected_preset_key = (web_mode: string) =>
  `last-selected-preset-${web_mode}`

export const get_last_selected_group_state_key = (web_mode: string) =>
  `last-selected-group-${web_mode}`

export interface HistoryEntry {
  text: string
  createdAt: number
}
