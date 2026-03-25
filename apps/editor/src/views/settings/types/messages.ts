import { ToolType } from './tools'

export type ProviderForClient = {
  name: string
  api_key_mask: string
  base_url: string
}

export type ConfigurationForClient = {
  id: string
  model: string
  description: string
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

export interface GetConfigurationsMessage {
  command: 'GET_CONFIGURATIONS'
}

export interface ReorderConfigurationsMessage {
  command: 'REORDER_CONFIGURATIONS'
  configurations: ConfigurationForClient[]
}

export interface DeleteConfigurationMessage {
  command: 'DELETE_CONFIGURATION'
  configuration_id: string
}

export interface SetDefaultConfigurationMessage {
  command: 'SET_DEFAULT_CONFIGURATION'
  tool_name: ToolType
  configuration_id: string | null
}

export interface SelectDefaultConfigurationMessage {
  command: 'SELECT_DEFAULT_CONFIGURATION'
  tool_name: ToolType
}

export interface GetCommitMessageInstructionsMessage {
  command: 'GET_COMMIT_MESSAGE_INSTRUCTIONS'
}

export interface UpdateCommitMessageInstructionsMessage {
  command: 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS'
  instructions: string
}

export interface GetIncludePromptsInCommitMessagesMessage {
  command: 'GET_INCLUDE_PROMPTS_IN_COMMIT_MESSAGES'
}

export interface UpdateIncludePromptsInCommitMessagesMessage {
  command: 'UPDATE_INCLUDE_PROMPTS_IN_COMMIT_MESSAGES'
  enabled: boolean
}

export interface GetVoiceInputInstructionsMessage {
  command: 'GET_VOICE_INPUT_INSTRUCTIONS'
}

export interface UpdateVoiceInputInstructionsMessage {
  command: 'UPDATE_VOICE_INPUT_INSTRUCTIONS'
  instructions: string
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

export interface GetReuseLastTabMessage {
  command: 'GET_REUSE_LAST_TAB'
}

export interface UpdateReuseLastTabMessage {
  command: 'UPDATE_REUSE_LAST_TAB'
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
  configuration_id?: string
  insertion_index?: number
  create_on_top?: boolean
  duplicate_from_id?: string
}

export interface GetFixAllAutomaticallyMessage {
  command: 'GET_FIX_ALL_AUTOMATICALLY'
}

export interface UpdateFixAllAutomaticallyMessage {
  command: 'UPDATE_FIX_ALL_AUTOMATICALLY'
  enabled: boolean
}

export interface GetExtendedCacheDurationForAnthropicMessage {
  command: 'GET_EXTENDED_CACHE_DURATION_FOR_ANTHROPIC'
}

export interface UpdateExtendedCacheDurationForAnthropicMessage {
  command: 'UPDATE_EXTENDED_CACHE_DURATION_FOR_ANTHROPIC'
  enabled: boolean
}

export interface OpenKeybindingsMessage {
  command: 'OPEN_KEYBINDINGS'
  search?: string
}

export interface OpenExternalUrlMessage {
  command: 'OPEN_EXTERNAL_URL'
  url: string
}

export type FrontendMessage =
  | GetModelProvidersMessage
  | ReorderModelProvidersMessage
  | AddModelProviderMessage
  | DeleteModelProviderMessage
  | EditCustomModelProviderMessage
  | GetConfigurationsMessage
  | ReorderConfigurationsMessage
  | DeleteConfigurationMessage
  | SetDefaultConfigurationMessage
  | SelectDefaultConfigurationMessage
  | GetCommitMessageInstructionsMessage
  | UpdateCommitMessageInstructionsMessage
  | GetIncludePromptsInCommitMessagesMessage
  | UpdateIncludePromptsInCommitMessagesMessage
  | GetVoiceInputInstructionsMessage
  | UpdateVoiceInputInstructionsMessage
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
  | GetReuseLastTabMessage
  | UpdateReuseLastTabMessage
  | GetClearChecksInWorkspaceBehaviorMessage
  | UpdateClearChecksInWorkspaceBehaviorMessage
  | UpsertConfigurationMessage
  | OpenEditorSettingsMessage
  | OpenIgnorePatternsSettingsMessage
  | OpenAllowPatternsSettingsMessage
  | GetFixAllAutomaticallyMessage
  | UpdateFixAllAutomaticallyMessage
  | GetExtendedCacheDurationForAnthropicMessage
  | UpdateExtendedCacheDurationForAnthropicMessage
  | OpenKeybindingsMessage
  | OpenExternalUrlMessage

// === FROM BACKEND TO FRONTEND ===
export interface ModelProvidersMessage {
  command: 'MODEL_PROVIDERS'
  providers: ProviderForClient[]
}

export interface ConfigurationsMessage {
  command: 'CONFIGURATIONS'
  configurations: ConfigurationForClient[]
  defaults: Record<ToolType, string | null>
}

export interface CommitMessageInstructionsMessage {
  command: 'COMMIT_MESSAGE_INSTRUCTIONS'
  instructions: string
}

export interface IncludePromptsInCommitMessagesMessage {
  command: 'INCLUDE_PROMPTS_IN_COMMIT_MESSAGES'
  enabled: boolean
}

export interface VoiceInputInstructionsMessage {
  command: 'VOICE_INPUT_INSTRUCTIONS'
  instructions: string
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

export interface ReuseLastTabMessage {
  command: 'REUSE_LAST_TAB'
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

export interface ExtendedCacheDurationForAnthropicMessage {
  command: 'EXTENDED_CACHE_DURATION_FOR_ANTHROPIC'
  enabled: boolean
}

export type BackendMessage =
  | ModelProvidersMessage
  | ConfigurationsMessage
  | CommitMessageInstructionsMessage
  | IncludePromptsInCommitMessagesMessage
  | VoiceInputInstructionsMessage
  | EditContextSystemInstructionsMessage
  | EditFormatInstructionsMessage
  | ContextSizeWarningThresholdMessage
  | AreAutomaticCheckpointsDisabledMessage
  | CheckpointLifespanMessage
  | GeminiUserIdMessage
  | AiStudioUserIdMessage
  | SendWithShiftEnterMessage
  | CheckNewFilesMessage
  | ReuseLastTabMessage
  | ClearChecksInWorkspaceBehaviorMessage
  | ShowSectionMessage
  | FixAllAutomaticallyMessage
  | ExtendedCacheDurationForAnthropicMessage
