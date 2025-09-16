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

export type BackendMessage =
  | ModelProvidersMessage
  | CodeCompletionsConfigurationsMessage
  | EditContextConfigurationsMessage
  | IntelligentUpdateConfigurationsMessage
  | CommitMessagesConfigurationsMessage
