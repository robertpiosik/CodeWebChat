import { ApiFeature } from '@/views/shared/types/api-features'
import { WebConfiguration } from '@/types/web-configuration'
import { CliConfiguration } from '@/types/cli-configuration'

export type Provider = {
  name: string
  api_key_mask: string
  base_url: string
  extended_cache?: boolean
}

export type ApiConfiguration = {
  id: string
  provider_name: string
  model: string
  reasoning_effort?: string
  is_pinned?: boolean
}

// === FROM FRONTEND TO BACKEND ===
export interface GetProvidersMessage {
  command: 'GET_PROVIDERS'
}

export interface ReorderProvidersMessage {
  command: 'REORDER_PROVIDERS'
  providers: Provider[]
}

export interface AddProviderMessage {
  command: 'ADD_PROVIDER'
  insertion_index?: number
  exact_insertion?: boolean
}

export interface DeleteProviderMessage {
  command: 'DELETE_PROVIDER'
  provider_name: string
}

export interface GetApiConfigurationsMessage {
  command: 'GET_API_CONFIGURATIONS'
}

export interface SetDefaultApiConfigurationMessage {
  command: 'SET_DEFAULT_API_CONFIGURATION'
  api_feature: ApiFeature
  api_configuration_id: string | null
}

export interface SelectDefaultApiConfigurationMessage {
  command: 'SELECT_DEFAULT_API_CONFIGURATION'
  api_feature: ApiFeature
}

export interface GetCommitMessageInstructionsMessage {
  command: 'GET_COMMIT_MESSAGE_INSTRUCTIONS'
}

export interface UpdateCommitMessageInstructionsMessage {
  command: 'UPDATE_COMMIT_MESSAGE_INSTRUCTIONS'
  instructions: string
}

export interface GetAttachAsciiTreeOfContextMessage {
  command: 'GET_ATTACH_ASCII_TREE_OF_CONTEXT'
}

export interface UpdateAttachAsciiTreeOfContextMessage {
  command: 'UPDATE_ATTACH_ASCII_TREE_OF_CONTEXT'
  value: 'ask' | 'always' | 'never'
}

export interface GetUseContextFilesInCommitMessagePromptMessage {
  command: 'GET_USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
}

export interface UpdateUseContextFilesInCommitMessagePromptMessage {
  command: 'UPDATE_USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
  value: 'ask' | 'always' | 'never'
}

export interface GetSelectAllPromptsInCommitMessagesByDefaultMessage {
  command: 'GET_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
}

export interface UpdateSelectAllPromptsInCommitMessagesByDefaultMessage {
  command: 'UPDATE_SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
  enabled: boolean
}

export interface GetEditFilesSystemInstructionsMessage {
  command: 'GET_EDIT_FILES_SYSTEM_INSTRUCTIONS'
}

export interface UpdateEditFilesSystemInstructionsMessage {
  command: 'UPDATE_EDIT_FILES_SYSTEM_INSTRUCTIONS'
  instructions: string
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

export interface OpenKeybindingsMessage {
  command: 'OPEN_KEYBINDINGS'
  search?: string
}

export interface OpenExternalUrlMessage {
  command: 'OPEN_EXTERNAL_URL'
  url: string
}

export interface GetWebConfigurationsMessage {
  command: 'GET_WEB_CONFIGURATIONS'
}
export interface ReorderWebConfigurationsMessage {
  command: 'REORDER_WEB_CONFIGURATIONS'
  web_configurations: WebConfiguration[]
}
export interface DeleteWebConfigurationMessage {
  command: 'DELETE_WEB_CONFIGURATION'
  name: string
}

export interface CreateWebConfigurationMessage {
  command: 'CREATE_WEB_CONFIGURATION'
  web_configuration_id?: string
  insertion_index?: number
  exact_insertion?: boolean
}

export interface PickModelMessage {
  command: 'PICK_MODEL'
  chatbot_name: string
  current_model_id?: string
}

export interface PickChatbotMessage {
  command: 'PICK_CHATBOT'
  chatbot_id?: string
}

export interface PickReasoningEffortMessage {
  command: 'PICK_REASONING_EFFORT'
  supported_efforts: string[]
  current_effort?: string
}

export interface UpdateWebConfigurationMessage {
  command: 'UPDATE_WEB_CONFIGURATION'
  updating_web_configuration: WebConfiguration
  updated_web_configuration: WebConfiguration
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
}

export interface GetAgentConfigurationsMessage {
  command: 'GET_AGENT_CONFIGURATIONS'
}
export interface ReorderAgentConfigurationsMessage {
  command: 'REORDER_AGENT_CONFIGURATIONS'
  agent_configurations: CliConfiguration[]
}
export interface DeleteAgentConfigurationMessage {
  command: 'DELETE_AGENT_CONFIGURATION'
  name: string
}
export interface CreateAgentConfigurationMessage {
  command: 'CREATE_AGENT_CONFIGURATION'
  insertion_index?: number
  exact_insertion?: boolean
}
export interface UpdateAgentConfigurationMessage {
  command: 'UPDATE_AGENT_CONFIGURATION'
  updating_agent_configuration: CliConfiguration
  updated_agent_configuration: CliConfiguration
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
}
export interface PickAgentMessage {
  command: 'PICK_AGENT'
  agent_id?: string
}

export interface CreateApiConfigurationMessage {
  command: 'CREATE_API_CONFIGURATION'
  api_feature?: ApiFeature
  insertion_index?: number
  exact_insertion?: boolean
}

export interface UpdateApiConfigurationMessage {
  command: 'UPDATE_API_CONFIGURATION'
  updating_api_configuration: ApiConfiguration
  updated_api_configuration: ApiConfiguration
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
  api_feature?: ApiFeature
}

export interface DeleteApiConfigurationMessage {
  command: 'DELETE_API_CONFIGURATION'
  api_configuration_id: string
}

export interface ReorderApiConfigurationsMessage {
  command: 'REORDER_API_CONFIGURATIONS'
  api_configurations: ApiConfiguration[]
}

export interface PickProviderMessage {
  command: 'PICK_PROVIDER'
  current_provider_name?: string
}

export interface PickApiModelMessage {
  command: 'PICK_API_MODEL'
  provider_name: string
  current_model?: string
}

export interface PickApiReasoningEffortMessage {
  command: 'PICK_API_REASONING_EFFORT'
  current_effort?: string
  provider_name: string
  model: string
}

export interface UpdateProviderMessage {
  command: 'UPDATE_PROVIDER'
  original_name?: string
  updating_provider?: Provider
  provider: {
    name: string
    base_url: string
    api_key?: string
    is_api_key_cleared?: boolean
    extended_cache?: boolean
  }
  origin?: 'cancel' | 'save'
  is_new?: boolean
  insertion_index?: number
}

export type Template = {
  name?: string
  template: string
}

export interface GetTemplatesMessage {
  command: 'GET_TEMPLATES'
}

export interface UpdateTemplatesMessage {
  command: 'UPDATE_TEMPLATES'
  templates_key: string
  templates: Template[]
}

export interface CreateTemplateMessage {
  command: 'CREATE_TEMPLATE'
  templates_key: string
  insertion_index?: number
  exact_insertion?: boolean
}

export interface DeleteTemplateMessage {
  command: 'DELETE_TEMPLATE'
  templates_key: string
  index: number
}

export interface GetIsModernUiMessage {
  command: 'GET_IS_MODERN_UI'
}

export type FrontendMessage =
  | GetProvidersMessage
  | ReorderProvidersMessage
  | AddProviderMessage
  | DeleteProviderMessage
  | GetApiConfigurationsMessage
  | SetDefaultApiConfigurationMessage
  | SelectDefaultApiConfigurationMessage
  | GetCommitMessageInstructionsMessage
  | UpdateCommitMessageInstructionsMessage
  | GetAttachAsciiTreeOfContextMessage
  | UpdateAttachAsciiTreeOfContextMessage
  | GetUseContextFilesInCommitMessagePromptMessage
  | UpdateUseContextFilesInCommitMessagePromptMessage
  | GetSelectAllPromptsInCommitMessagesByDefaultMessage
  | UpdateSelectAllPromptsInCommitMessagesByDefaultMessage
  | GetEditFilesSystemInstructionsMessage
  | UpdateEditFilesSystemInstructionsMessage
  | SettingsUiReadyMessage
  | GetGeminiUserIdMessage
  | UpdateGeminiUserIdMessage
  | GetAiStudioUserIdMessage
  | UpdateAiStudioUserIdMessage
  | GetSendWithShiftEnterMessage
  | UpdateSendWithShiftEnterMessage
  | OpenEditorSettingsMessage
  | OpenIgnorePatternsSettingsMessage
  | OpenAllowPatternsSettingsMessage
  | OpenKeybindingsMessage
  | OpenExternalUrlMessage
  | GetWebConfigurationsMessage
  | ReorderWebConfigurationsMessage
  | DeleteWebConfigurationMessage
  | CreateWebConfigurationMessage
  | PickModelMessage
  | PickChatbotMessage
  | PickReasoningEffortMessage
  | UpdateWebConfigurationMessage
  | CreateApiConfigurationMessage
  | UpdateApiConfigurationMessage
  | DeleteApiConfigurationMessage
  | ReorderApiConfigurationsMessage
  | PickProviderMessage
  | PickApiModelMessage
  | PickApiReasoningEffortMessage
  | UpdateProviderMessage
  | GetIsModernUiMessage
  | GetTemplatesMessage
  | UpdateTemplatesMessage
  | CreateTemplateMessage
  | DeleteTemplateMessage
  | GetAgentConfigurationsMessage
  | ReorderAgentConfigurationsMessage
  | DeleteAgentConfigurationMessage
  | CreateAgentConfigurationMessage
  | UpdateAgentConfigurationMessage
  | PickAgentMessage
  | SetDefaultAgentConfigurationMessage
  | SelectDefaultAgentConfigurationMessage

// === FROM BACKEND TO FRONTEND ===
export interface ProvidersMessage {
  command: 'PROVIDERS'
  providers: Provider[]
}

export interface ApiConfigurationsMessage {
  command: 'API_CONFIGURATIONS'
  api_configurations: ApiConfiguration[]
  defaults: Record<ApiFeature, string | null>
}

export interface CommitMessageInstructionsMessage {
  command: 'COMMIT_MESSAGE_INSTRUCTIONS'
  instructions: string
  default_instructions: string
}

export interface AttachAsciiTreeOfContextMessage {
  command: 'ATTACH_ASCII_TREE_OF_CONTEXT'
  value: 'ask' | 'always' | 'never'
}

export interface UseContextFilesInCommitMessagePromptMessage {
  command: 'USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT'
  value: 'ask' | 'always' | 'never'
}

export interface SelectAllPromptsInCommitMessagesByDefaultMessage {
  command: 'SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT'
  enabled: boolean
}

export interface EditFilesSystemInstructionsMessage {
  command: 'EDIT_FILES_SYSTEM_INSTRUCTIONS'
  instructions: string
  default_instructions: string
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

export interface ShowSectionMessage {
  command: 'SHOW_SECTION'
  section: string
}

export interface WebConfigurationsMessage {
  command: 'WEB_CONFIGURATIONS'
  web_configurations: WebConfiguration[]
}

export interface NewlyPickedModelMessage {
  command: 'NEWLY_PICKED_MODEL'
  model_id: string
}

export interface NewlyPickedChatbotMessage {
  command: 'NEWLY_PICKED_CHATBOT'
  chatbot_id: string
}

export interface NewlyPickedReasoningEffortMessage {
  command: 'NEWLY_PICKED_REASONING_EFFORT'
  effort: string
}


export interface SetDefaultAgentConfigurationMessage {
  command: 'SET_DEFAULT_AGENT_CONFIGURATION'
  cli_feature: string
  agent_configuration_name: string | null
}

export interface SelectDefaultAgentConfigurationMessage {
  command: 'SELECT_DEFAULT_AGENT_CONFIGURATION'
  cli_feature: string
}

export interface AgentConfigurationsMessage {
  command: 'AGENT_CONFIGURATIONS'
  agent_configurations: CliConfiguration[]
  defaults?: Record<string, string | null>
}
export interface AgentConfigurationUpdatedMessage {
  command: 'AGENT_CONFIGURATION_UPDATED'
}
export interface StartAgentConfigurationCreationMessage {
  command: 'START_AGENT_CONFIGURATION_CREATION'
  agent_configuration: CliConfiguration
  insertion_index?: number
}
export interface NewlyPickedAgentMessage {
  command: 'NEWLY_PICKED_AGENT'
  agent_id: string
}

export interface WebConfigurationUpdatedMessage {
  command: 'WEB_CONFIGURATION_UPDATED'
}

export interface StartWebConfigurationCreationMessage {
  command: 'START_WEB_CONFIGURATION_CREATION'
  web_configuration: WebConfiguration
  insertion_index?: number
}

export interface StartApiConfigurationCreationMessage {
  command: 'START_API_CONFIGURATION_CREATION'
  api_configuration: ApiConfiguration
  insertion_index?: number
  api_feature?: ApiFeature
}

export interface ApiConfigurationUpdatedMessage {
  command: 'API_CONFIGURATION_UPDATED'
}

export interface NewlyPickedProviderMessage {
  command: 'NEWLY_PICKED_PROVIDER'
  provider_name: string
}

export interface NewlyPickedApiModelMessage {
  command: 'NEWLY_PICKED_API_MODEL'
  model_id: string
}

export interface NewlyPickedApiReasoningEffortMessage {
  command: 'NEWLY_PICKED_API_REASONING_EFFORT'
  effort?: string
}

export interface StartProviderCreationMessage {
  command: 'START_PROVIDER_CREATION'
  provider: Provider
  insertion_index?: number
}

export interface ProviderUpdatedMessage {
  command: 'PROVIDER_UPDATED'
}

export interface IsModernUiMessage {
  command: 'IS_MODERN_UI'
  is_modern_ui: boolean
}

export interface TemplatesMessage {
  command: 'TEMPLATES'
  templates: Record<string, Template[]>
}

export interface StartTemplateCreationMessage {
  command: 'START_TEMPLATE_CREATION'
  templates_key: string
  template: Template
  insertion_index?: number
}

export type BackendMessage =
  | ProvidersMessage
  | ApiConfigurationsMessage
  | CommitMessageInstructionsMessage
  | AttachAsciiTreeOfContextMessage
  | UseContextFilesInCommitMessagePromptMessage
  | SelectAllPromptsInCommitMessagesByDefaultMessage
  | EditFilesSystemInstructionsMessage
  | GeminiUserIdMessage
  | AiStudioUserIdMessage
  | SendWithShiftEnterMessage
  | ShowSectionMessage
  | WebConfigurationsMessage
  | NewlyPickedModelMessage
  | NewlyPickedChatbotMessage
  | NewlyPickedReasoningEffortMessage
  | WebConfigurationUpdatedMessage
  | StartWebConfigurationCreationMessage
  | StartApiConfigurationCreationMessage
  | ApiConfigurationUpdatedMessage
  | NewlyPickedProviderMessage
  | NewlyPickedApiModelMessage
  | NewlyPickedApiReasoningEffortMessage
  | StartProviderCreationMessage
  | ProviderUpdatedMessage
  | IsModernUiMessage
  | TemplatesMessage
  | StartTemplateCreationMessage
  | AgentConfigurationsMessage
  | AgentConfigurationUpdatedMessage
  | StartAgentConfigurationCreationMessage
  | NewlyPickedAgentMessage