export const LAST_APPLIED_CHANGES_STATE_KEY = 'lastAppliedChangesState'
export const SAVED_CONTEXTS_STATE_KEY = 'savedContexts'
export const LAST_CONTEXT_SAVE_LOCATION_STATE_KEY = 'lastSaveLocation'
export const LAST_CONTEXT_READ_LOCATION_STATE_KEY = 'lastReadLocation'
export const CONTEXT_CHECKED_PATHS_STATE_KEY = 'context-checked-paths'
export const CONTEXT_CHECKED_URLS_STATE_KEY = 'context-checked-urls'
export const TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY =
  'toolConfigCodeCompletions'
export const TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY = 'toolConfigFileRefactoring'
export const TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY =
  'toolConfigIntelligentUpdate'
export const TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY = 'toolConfigCommitMessages'
export const COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY =
  'commitMessagesConfirmationThreshold'
export const DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY =
  'defaultCodeCompletionsConfiguration'
export const DEFAULT_EDIT_CONTEXT_CONFIGURATION_STATE_KEY =
  'defaultFileRefactoringConfiguration'
export const DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY =
  'defaultCommitMessagesConfiguration'
export const DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY =
  'defaultIntelligentUpdateConfiguration'
export const LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY =
  'lastSelectedCodeCompletionConfigIndex'
export const LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY =
  'lastSelectedFileRefactoringConfigIndex'
export const LAST_SELECTED_COMMIT_MESSAGES_CONFIG_INDEX_STATE_KEY =
  'lastSelectedCommitMessagesConfigIndex'
export const LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY =
  'lastSelectedIntelligentUpdateConfigIndex'
export const LAST_GROUP_OR_PRESET_CHOICE_STATE_KEY =
  'last-group-or-preset-choice'
export const LAST_SELECTED_GROUP_STATE_KEY = 'last-selected-group'
export const LAST_SELECTED_PRESET_KEY = 'last-selected-preset'
export const LAST_CHOSEN_COMMAND_BY_VIEW_TYPE_STATE_KEY =
  'lastChosenCommandByViewType'

export const HISTORY_ASK_STATE_KEY = 'history-ask'
export const HISTORY_EDIT_STATE_KEY = 'history-edit'
export const HISTORY_CODE_COMPLETIONS_STATE_KEY = 'history-code-completions'
export const HISTORY_NO_CONTEXT_STATE_KEY = 'history-no-context'

export const PINNED_HISTORY_ASK_STATE_KEY = 'pinned-history-ask'
export const PINNED_HISTORY_EDIT_STATE_KEY = 'pinned-history-edit'
export const PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY =
  'pinned-history-code-completions'
export const PINNED_HISTORY_NO_CONTEXT_STATE_KEY = 'pinned-history-no-context'

export const RECENT_FILES_STORAGE_KEY = 'recent-files'
export interface HistoryEntry {
  text: string
  createdAt: number
}
