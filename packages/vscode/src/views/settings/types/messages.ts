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
export interface GetApiProvidersMessage {
  command: 'GET_API_PROVIDERS'
}

export interface ReorderApiProvidersMessage {
  command: 'REORDER_API_PROVIDERS'
  providers: ProviderForClient[]
}

export interface AddApiProviderMessage {
  command: 'ADD_API_PROVIDER'
}

export interface DeleteApiProviderMessage {
  command: 'DELETE_API_PROVIDER'
  provider_name: string
}

export interface RenameApiProviderMessage {
  command: 'RENAME_API_PROVIDER'
  provider_name: string
}

export interface ChangeApiProviderKeyMessage {
  command: 'CHANGE_API_PROVIDER_KEY'
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
  | GetApiProvidersMessage
  | ReorderApiProvidersMessage
  | AddApiProviderMessage
  | DeleteApiProviderMessage
  | RenameApiProviderMessage
  | ChangeApiProviderKeyMessage
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
export interface ApiProvidersMessage {
  command: 'API_PROVIDERS'
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
  | ApiProvidersMessage
  | CodeCompletionsConfigurationsMessage
  | EditContextConfigurationsMessage
  | IntelligentUpdateConfigurationsMessage
  | CommitMessagesConfigurationsMessage
