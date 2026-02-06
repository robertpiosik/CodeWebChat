import { ToolType } from './tools'

export type ProviderForClient = {
  name: string
  type: 'built-in' | 'custom'
  apiKeyMask: string
  baseUrl: string
}

export type ConfigurationForClient = {
  id: string
  model: string
  description: string
  is_default?: boolean
}

export type EditFormatInstructions = {
  whole: string
  truncated: string
  before_after: string
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
  insertion_index?: number
  create_on_top?: boolean
}

export interface DeleteModelProviderMessage {
  command: 'DELETE_MODEL_PROVIDER'
  provider_name: string
}

export interface EditCustomModelProviderMessage {
  command: 'EDIT_CUSTOM_MODEL_PROVIDER'
  provider_name: string
}

export interface ChangeModelProviderKeyMessage {
  command: 'CHANGE_MODEL_PROVIDER_KEY'
  provider_name: string
}

export interface GetCodeAtCursorConfigurationsMessage {
  command: 'GET_CODE_AT_CURSOR_CONFIGURATIONS'
}

export interface ReorderCodeAtCursorConfigurationsMessage {
  command: 'REORDER_CODE_AT_CURSOR_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeleteCodeAtCursorConfigurationMessage {
  command: 'DELETE_CODE_AT_CURSOR_CONFIGURATION'
  configuration_id: string
}

export interface SetDefaultCodeAtCursorConfigurationMessage {
  command: 'SET_DEFAULT_CODE_AT_CURSOR_CONFIGURATION'
  configuration_id: string | null
}

export interface GetEditContextConfigurationsMessage {
  command: 'GET_EDIT_CONTEXT_CONFIGURATIONS'
}

export interface ReorderEditContextConfigurationsMessage {
  command: 'REORDER_EDIT_CONTEXT_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeleteEditContextConfigurationMessage {
  command: 'DELETE_EDIT_CONTEXT_CONFIGURATION'
  configuration_id: string
}

export interface GetIntelligentUpdateConfigurationsMessage {
  command: 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS'
}

export interface ReorderIntelligentUpdateConfigurationsMessage {
  command: 'REORDER_INTELLIGENT_UPDATE_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeleteIntelligentUpdateConfigurationMessage {
  command: 'DELETE_INTELLIGENT_UPDATE_CONFIGURATION'
  configuration_id: string
}

export interface SetDefaultIntelligentUpdateConfigurationMessage {
  command: 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION'
  configuration_id: string | null
}

export interface GetPruneContextConfigurationsMessage {
  command: 'GET_PRUNE_CONTEXT_CONFIGURATIONS'
}

export interface ReorderPruneContextConfigurationsMessage {
  command: 'REORDER_PRUNE_CONTEXT_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeletePruneContextConfigurationMessage {
  command: 'DELETE_PRUNE_CONTEXT_CONFIGURATION'
  configuration_id: string
}

export interface GetVoiceInputConfigurationsMessage {
  command: 'GET_VOICE_INPUT_CONFIGURATIONS'
}

export interface ReorderVoiceInputConfigurationsMessage {
  command: 'REORDER_VOICE_INPUT_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeleteVoiceInputConfigurationMessage {
  command: 'DELETE_VOICE_INPUT_CONFIGURATION'
  configuration_id: string
}

export interface SetDefaultVoiceInputConfigurationMessage {
  command: 'SET_DEFAULT_VOICE_INPUT_CONFIGURATION'
  configuration_id: string | null
}

export interface GetCommitMessagesConfigurationsMessage {
  command: 'GET_COMMIT_MESSAGES_CONFIGURATIONS'
}

export interface ReorderCommitMessagesConfigurationsMessage {
  command: 'REORDER_COMMIT_MESSAGES_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeleteCommitMessagesConfigurationMessage {
  command: 'DELETE_COMMIT_MESSAGES_CONFIGURATION'
  configuration_id: string
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

export interface OpenIgnorePatternsSettingsMessage {
  command: 'OPEN_IGNORE_PATTERNS_SETTINGS'
}

export interface OpenAllowPatternsSettingsMessage {
  command: 'OPEN_ALLOW_PATTERNS_SETTINGS'
}

export interface GetContextSizeWarningThresholdMessage {
  command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD'
}

export interface UpdateContextSizeWarningThresholdMessage {
  command: 'UPDATE_CONTEXT_SIZE_WARNING_THRESHOLD'
  threshold: number | null
}

export interface GetAreAutomaticCheckpointsDisabledMessage {
  command: 'GET_ARE_AUTOMATIC_CHECKPOINTS_DISABLED'
}

export interface UpdateAreAutomaticCheckpointsDisabledMessage {
  command: 'UPDATE_ARE_AUTOMATIC_CHECKPOINTS_DISABLED'
  disabled: boolean
}

export interface GetCheckpointLifespanMessage {
  command: 'GET_CHECKPOINT_LIFESPAN'
}

export interface UpdateCheckpointLifespanMessage {
  command: 'UPDATE_CHECKPOINT_LIFESPAN'
  hours: number | null
}

export interface GetGeminiUserIdMessage {
  command: 'GET_GEMINI_USER_ID'
}

export interface UpdateGeminiUserIdMessage {
  command: 'UPDATE_GEMINI_USER_ID'
  geminiUserId: number | null
}

export interface GetAiStudioUserIdMessage {
  command: 'GET_AI_STUDIO_USER_ID'
}

export interface UpdateAiStudioUserIdMessage {
  command: 'UPDATE_AI_STUDIO_USER_ID'
  aiStudioUserId: number | null
}

export interface GetSendWithShiftEnterMessage {
  command: 'GET_SEND_WITH_SHIFT_ENTER'
}

export interface UpdateSendWithShiftEnterMessage {
  command: 'UPDATE_SEND_WITH_SHIFT_ENTER'
  enabled: boolean
}

export interface GetCheckNewFilesMessage {
  command: 'GET_CHECK_NEW_FILES'
}

export interface UpdateCheckNewFilesMessage {
  command: 'UPDATE_CHECK_NEW_FILES'
  enabled: boolean
}

export interface GetClearChecksInWorkspaceBehaviorMessage {
  command: 'GET_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
}

export interface UpdateClearChecksInWorkspaceBehaviorMessage {
  command: 'UPDATE_CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
  value: 'ignore-open-editors' | 'uncheck-all'
}

export interface UpsertConfigurationMessage {
  command: 'UPSERT_CONFIGURATION'
  tool_type: ToolType
  configuration_id?: string
  insertion_index?: number
  create_on_top?: boolean
}

export interface GetFixAllAutomaticallyMessage {
  command: 'GET_FIX_ALL_AUTOMATICALLY'
}

export interface UpdateFixAllAutomaticallyMessage {
  command: 'UPDATE_FIX_ALL_AUTOMATICALLY'
  enabled: boolean
}

export interface OpenKeybindingsMessage {
  command: 'OPEN_KEYBINDINGS'
  search?: string
}

export type FrontendMessage =
  | GetModelProvidersMessage
  | ReorderModelProvidersMessage
  | AddModelProviderMessage
  | DeleteModelProviderMessage
  | EditCustomModelProviderMessage
  | ChangeModelProviderKeyMessage
  | GetCodeAtCursorConfigurationsMessage
  | ReorderCodeAtCursorConfigurationsMessage
  | DeleteCodeAtCursorConfigurationMessage
  | SetDefaultCodeAtCursorConfigurationMessage
  | GetEditContextConfigurationsMessage
  | ReorderEditContextConfigurationsMessage
  | DeleteEditContextConfigurationMessage
  | GetIntelligentUpdateConfigurationsMessage
  | ReorderIntelligentUpdateConfigurationsMessage
  | DeleteIntelligentUpdateConfigurationMessage
  | SetDefaultIntelligentUpdateConfigurationMessage
  | GetPruneContextConfigurationsMessage
  | ReorderPruneContextConfigurationsMessage
  | DeletePruneContextConfigurationMessage
  | GetVoiceInputConfigurationsMessage
  | ReorderVoiceInputConfigurationsMessage
  | DeleteVoiceInputConfigurationMessage
  | SetDefaultVoiceInputConfigurationMessage
  | GetCommitMessagesConfigurationsMessage
  | ReorderCommitMessagesConfigurationsMessage
  | DeleteCommitMessagesConfigurationMessage
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
  | GetAreAutomaticCheckpointsDisabledMessage
  | UpdateAreAutomaticCheckpointsDisabledMessage
  | GetCheckpointLifespanMessage
  | UpdateCheckpointLifespanMessage
  | GetGeminiUserIdMessage
  | UpdateGeminiUserIdMessage
  | GetAiStudioUserIdMessage
  | UpdateAiStudioUserIdMessage
  | GetSendWithShiftEnterMessage
  | UpdateSendWithShiftEnterMessage
  | GetCheckNewFilesMessage
  | UpdateCheckNewFilesMessage
  | GetClearChecksInWorkspaceBehaviorMessage
  | UpdateClearChecksInWorkspaceBehaviorMessage
  | UpsertConfigurationMessage
  | OpenEditorSettingsMessage
  | OpenIgnorePatternsSettingsMessage
  | OpenAllowPatternsSettingsMessage
  | GetFixAllAutomaticallyMessage
  | UpdateFixAllAutomaticallyMessage
  | OpenKeybindingsMessage

// === FROM BACKEND TO FRONTEND ===
export interface ModelProvidersMessage {
  command: 'MODEL_PROVIDERS'
  providers: ProviderForClient[]
}

export interface CodeAtCursorConfigurationsMessage {
  command: 'CODE_AT_CURSOR_CONFIGURATIONS'
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

export interface PruneContextConfigurationsMessage {
  command: 'PRUNE_CONTEXT_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface VoiceInputConfigurationsMessage {
  command: 'VOICE_INPUT_CONFIGURATIONS'
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

export interface AreAutomaticCheckpointsDisabledMessage {
  command: 'ARE_AUTOMATIC_CHECKPOINTS_DISABLED'
  disabled: boolean
}

export interface CheckpointLifespanMessage {
  command: 'CHECKPOINT_LIFESPAN'
  hours: number
}

export interface GeminiUserIdMessage {
  command: 'GEMINI_USER_ID'
  geminiUserId: number | null
}

export interface AiStudioUserIdMessage {
  command: 'AI_STUDIO_USER_ID'
  aiStudioUserId: number | null
}

export interface SendWithShiftEnterMessage {
  command: 'SEND_WITH_SHIFT_ENTER'
  enabled: boolean
}

export interface CheckNewFilesMessage {
  command: 'CHECK_NEW_FILES'
  enabled: boolean
}

export interface ClearChecksInWorkspaceBehaviorMessage {
  command: 'CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR'
  value: 'ignore-open-editors' | 'uncheck-all'
}

export interface ShowSectionMessage {
  command: 'SHOW_SECTION'
  section: string
}

export interface FixAllAutomaticallyMessage {
  command: 'FIX_ALL_AUTOMATICALLY'
  enabled: boolean
}

export type BackendMessage =
  | ModelProvidersMessage
  | CodeAtCursorConfigurationsMessage
  | EditContextConfigurationsMessage
  | IntelligentUpdateConfigurationsMessage
  | PruneContextConfigurationsMessage
  | VoiceInputConfigurationsMessage
  | CommitMessagesConfigurationsMessage
  | CommitMessageInstructionsMessage
  | CommitMessageAutoAcceptAfterMessage
  | EditContextSystemInstructionsMessage
  | EditFormatInstructionsMessage
  | ContextSizeWarningThresholdMessage
  | AreAutomaticCheckpointsDisabledMessage
  | CheckpointLifespanMessage
  | GeminiUserIdMessage
  | AiStudioUserIdMessage
  | SendWithShiftEnterMessage
  | CheckNewFilesMessage
  | ClearChecksInWorkspaceBehaviorMessage
  | ShowSectionMessage
  | FixAllAutomaticallyMessage
