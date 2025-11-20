// A simplified Provider type for sending to the client
export type ProviderForClient = {
  name: string
  type: 'built-in' | 'custom'
  apiKeyMask: string
  baseUrl: string
}

// A simplified Configuration type for sending to the client
export type ConfigurationForClient = {
  id: string
  model: string
  description: string
  is_default?: boolean
}

export type EditFormatInstructions = {
  whole: string
  truncated: string
  diff: string
}

// === FROM FRONTEND TO BACKEND ===
export interface GetModelProvidersMessage {
  command: 'GET_MODEL_PROVIDERS'
}

export interface ReorderModelProvidersMessage {
  command: 'REORDER_MODEL_PROVIDERS'
  providers: ProviderForClient[]
}

export interface AddModelProviderMessage {
  command: 'ADD_MODEL_PROVIDER'
}

export interface DeleteModelProviderMessage {
  command: 'DELETE_MODEL_PROVIDER'
  provider_name: string
}

export interface RenameModelProviderMessage {
  command: 'RENAME_MODEL_PROVIDER'
  provider_name: string
}

export interface ChangeModelProviderKeyMessage {
  command: 'CHANGE_MODEL_PROVIDER_KEY'
  provider_name: string
}

export interface GetCodeCompletionsConfigurationsMessage {
  command: 'GET_CODE_COMPLETIONS_CONFIGURATIONS'
}

export interface ReorderCodeCompletionsConfigurationsMessage {
  command: 'REORDER_CODE_COMPLETIONS_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface EditCodeCompletionsConfigurationMessage {
  command: 'EDIT_CODE_COMPLETIONS_CONFIGURATION'
  configuration_id: string
}

export interface DeleteCodeCompletionsConfigurationMessage {
  command: 'DELETE_CODE_COMPLETIONS_CONFIGURATION'
  configuration_id: string
}

export interface AddCodeCompletionsConfigurationMessage {
  command: 'ADD_CODE_COMPLETIONS_CONFIGURATION'
}

export interface SetDefaultCodeCompletionsConfigurationMessage {
  command: 'SET_DEFAULT_CODE_COMPLETIONS_CONFIGURATION'
  configuration_id: string | null
}

export interface GetEditContextConfigurationsMessage {
  command: 'GET_EDIT_CONTEXT_CONFIGURATIONS'
}

export interface ReorderEditContextConfigurationsMessage {
  command: 'REORDER_EDIT_CONTEXT_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface EditEditContextConfigurationMessage {
  command: 'EDIT_EDIT_CONTEXT_CONFIGURATION'
  configuration_id: string
}

export interface DeleteEditContextConfigurationMessage {
  command: 'DELETE_EDIT_CONTEXT_CONFIGURATION'
  configuration_id: string
}

export interface AddEditContextConfigurationMessage {
  command: 'ADD_EDIT_CONTEXT_CONFIGURATION'
}

export interface GetIntelligentUpdateConfigurationsMessage {
  command: 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS'
}

export interface ReorderIntelligentUpdateConfigurationsMessage {
  command: 'REORDER_INTELLIGENT_UPDATE_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface EditIntelligentUpdateConfigurationMessage {
  command: 'EDIT_INTELLIGENT_UPDATE_CONFIGURATION'
  configuration_id: string
}

export interface DeleteIntelligentUpdateConfigurationMessage {
  command: 'DELETE_INTELLIGENT_UPDATE_CONFIGURATION'
  configuration_id: string
}

export interface AddIntelligentUpdateConfigurationMessage {
  command: 'ADD_INTELLIGENT_UPDATE_CONFIGURATION'
}

export interface SetDefaultIntelligentUpdateConfigurationMessage {
  command: 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION'
  configuration_id: string | null
}

export interface GetCommitMessagesConfigurationsMessage {
  command: 'GET_COMMIT_MESSAGES_CONFIGURATIONS'
}

export interface ReorderCommitMessagesConfigurationsMessage {
  command: 'REORDER_COMMIT_MESSAGES_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface EditCommitMessagesConfigurationMessage {
  command: 'EDIT_COMMIT_MESSAGES_CONFIGURATION'
  configuration_id: string
}

export interface DeleteCommitMessagesConfigurationMessage {
  command: 'DELETE_COMMIT_MESSAGES_CONFIGURATION'
  configuration_id: string
}

export interface AddCommitMessagesConfigurationMessage {
  command: 'ADD_COMMIT_MESSAGES_CONFIGURATION'
}

export interface SetDefaultCommitMessagesConfigurationMessage {
  command: 'SET_DEFAULT_COMMIT_MESSAGES_CONFIGURATION'
  configuration_id: string | null
}

export interface GetCommitMessageInstructionsMessage {
  command: 'GET_COMMIT_MESSAGE_INSTRUCTIONS'
}

export interface UpdateCommitMessageInstructionsMessage {
  command: 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS'
  instructions: string
}

export interface GetCommitMessageAutoAcceptAfterMessage {
  command: 'GET_COMMIT_MESSAGE_AUTO_ACCEPT_AFTER'
}

export interface UpdateCommitMessageAutoAcceptAfterMessage {
  command: 'UPDATE_COMMIT_MESSAGE_AUTO_ACCEPT_AFTER'
  seconds: number | null
}

export interface GetEditContextSystemInstructionsMessage {
  command: 'GET_EDIT_CONTEXT_SYSTEM_INSTRUCTIONS'
}

export interface UpdateEditContextSystemInstructionsMessage {
  command: 'UPDATE_EDIT_CONTEXT_SYSTEM_INSTRUCTIONS'
  instructions: string
}

export interface GetEditFormatInstructionsMessage {
  command: 'GET_EDIT_FORMAT_INSTRUCTIONS'
}

export interface UpdateEditFormatInstructionsMessage {
  command: 'UPDATE_EDIT_FORMAT_INSTRUCTIONS'
  instructions: EditFormatInstructions
}

export interface SettingsUiReadyMessage {
  command: 'SETTINGS_UI_READY'
}

export interface OpenEditorSettingsMessage {
  command: 'OPEN_EDITOR_SETTINGS'
}

export interface GetContextSizeWarningThresholdMessage {
  command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD'
}

export interface UpdateContextSizeWarningThresholdMessage {
  command: 'UPDATE_CONTEXT_SIZE_WARNING_THRESHOLD'
  threshold: number
}

export interface GetCheckpointLifespanMessage {
  command: 'GET_CHECKPOINT_LIFESPAN'
}

export interface UpdateCheckpointLifespanMessage {
  command: 'UPDATE_CHECKPOINT_LIFESPAN'
  hours: number
}

export interface GetGeminiUserIdMessage {
  command: 'GET_GEMINI_USER_ID'
}

export interface UpdateGeminiUserIdMessage {
  command: 'UPDATE_GEMINI_USER_ID'
  geminiUserId: number | null
}

export interface GetClearChecksInWorkspaceBehaviorMessage {
  command: 'GET_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
}

export interface UpdateClearChecksInWorkspaceBehaviorMessage {
  command: 'UPDATE_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
  value: 'ignore-open-editors' | 'uncheck-all'
}

export type FrontendMessage =
  | GetModelProvidersMessage
  | ReorderModelProvidersMessage
  | AddModelProviderMessage
  | DeleteModelProviderMessage
  | RenameModelProviderMessage
  | ChangeModelProviderKeyMessage
  | GetCodeCompletionsConfigurationsMessage
  | ReorderCodeCompletionsConfigurationsMessage
  | EditCodeCompletionsConfigurationMessage
  | DeleteCodeCompletionsConfigurationMessage
  | AddCodeCompletionsConfigurationMessage
  | SetDefaultCodeCompletionsConfigurationMessage
  | GetEditContextConfigurationsMessage
  | ReorderEditContextConfigurationsMessage
  | EditEditContextConfigurationMessage
  | DeleteEditContextConfigurationMessage
  | AddEditContextConfigurationMessage
  | GetIntelligentUpdateConfigurationsMessage
  | ReorderIntelligentUpdateConfigurationsMessage
  | EditIntelligentUpdateConfigurationMessage
  | DeleteIntelligentUpdateConfigurationMessage
  | AddIntelligentUpdateConfigurationMessage
  | SetDefaultIntelligentUpdateConfigurationMessage
  | GetCommitMessagesConfigurationsMessage
  | ReorderCommitMessagesConfigurationsMessage
  | EditCommitMessagesConfigurationMessage
  | DeleteCommitMessagesConfigurationMessage
  | AddCommitMessagesConfigurationMessage
  | SetDefaultCommitMessagesConfigurationMessage
  | GetCommitMessageInstructionsMessage
  | UpdateCommitMessageInstructionsMessage
  | GetCommitMessageAutoAcceptAfterMessage
  | UpdateCommitMessageAutoAcceptAfterMessage
  | GetEditContextSystemInstructionsMessage
  | UpdateEditContextSystemInstructionsMessage
  | GetEditFormatInstructionsMessage
  | UpdateEditFormatInstructionsMessage
  | SettingsUiReadyMessage
  | GetContextSizeWarningThresholdMessage
  | UpdateContextSizeWarningThresholdMessage
  | GetCheckpointLifespanMessage
  | UpdateCheckpointLifespanMessage
  | GetGeminiUserIdMessage
  | UpdateGeminiUserIdMessage
  | GetClearChecksInWorkspaceBehaviorMessage
  | UpdateClearChecksInWorkspaceBehaviorMessage
  | OpenEditorSettingsMessage

// === FROM BACKEND TO FRONTEND ===
export interface ModelProvidersMessage {
  command: 'MODEL_PROVIDERS'
  providers: ProviderForClient[]
}

export interface CodeCompletionsConfigurationsMessage {
  command: 'CODE_COMPLETIONS_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}
export interface EditContextConfigurationsMessage {
  command: 'EDIT_CONTEXT_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}
export interface IntelligentUpdateConfigurationsMessage {
  command: 'INTELLIGENT_UPDATE_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}
export interface CommitMessagesConfigurationsMessage {
  command: 'COMMIT_MESSAGES_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface CommitMessageInstructionsMessage {
  command: 'COMMIT_MESSAGE_INSTRUCTIONS'
  instructions: string
}

export interface CommitMessageAutoAcceptAfterMessage {
  command: 'COMMIT_MESSAGE_AUTO_ACCEPT_AFTER'
  seconds: number | null
}

export interface EditContextSystemInstructionsMessage {
  command: 'EDIT_CONTEXT_SYSTEM_INSTRUCTIONS'
  instructions: string
}

export interface EditFormatInstructionsMessage {
  command: 'EDIT_FORMAT_INSTRUCTIONS'
  instructions: EditFormatInstructions
}

export interface ContextSizeWarningThresholdMessage {
  command: 'CONTEXT_SIZE_WARNING_THRESHOLD'
  threshold: number
}

export interface CheckpointLifespanMessage {
  command: 'CHECKPOINT_LIFESPAN'
  hours: number
}

export interface GeminiUserIdMessage {
  command: 'GEMINI_USER_ID'
  geminiUserId: number | null
}

export interface ClearChecksInWorkspaceBehaviorMessage {
  command: 'CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
  value: 'ignore-open-editors' | 'uncheck-all'
}

export interface ShowSectionMessage {
  command: 'SHOW_SECTION'
  section: string
}

export type BackendMessage =
  | ModelProvidersMessage
  | CodeCompletionsConfigurationsMessage
  | EditContextConfigurationsMessage
  | IntelligentUpdateConfigurationsMessage
  | CommitMessagesConfigurationsMessage
  | CommitMessageInstructionsMessage
  | CommitMessageAutoAcceptAfterMessage
  | EditContextSystemInstructionsMessage
  | EditFormatInstructionsMessage
  | ContextSizeWarningThresholdMessage
  | CheckpointLifespanMessage
  | GeminiUserIdMessage
  | ClearChecksInWorkspaceBehaviorMessage
  | ShowSectionMessage
