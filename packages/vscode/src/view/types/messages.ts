import { CHATBOTS } from '@shared/constants/chatbots'
import { Preset } from '@shared/types/preset'

export interface BaseMessage {
  command: string
}

// Messages from webview to extension
export interface GetApiKeyMessage extends BaseMessage {
  command: 'GET_API_KEY'
}

export interface UpdateApiKeyMessage extends BaseMessage {
  command: 'UPDATE_API_KEY'
  api_key: string
}

export interface SaveChatInstructionMessage extends BaseMessage {
  command: 'SAVE_CHAT_INSTRUCTION'
  instruction: string
}

export interface SaveFimInstructionMessage extends BaseMessage {
  command: 'SAVE_FIM_INSTRUCTION'
  instruction: string
}

export interface GetConnectionStatusMessage extends BaseMessage {
  command: 'GET_CONNECTION_STATUS'
}

export interface GetPresetsMessage extends BaseMessage {
  command: 'GET_PRESETS'
}

export interface GetSelectedPresetsMessage extends BaseMessage {
  command: 'GET_SELECTED_PRESETS'
}

export interface SaveSelectedPresetsMessage extends BaseMessage {
  command: 'SAVE_SELECTED_PRESETS'
  names: string[]
}

export interface SavePresetsOrderMessage extends BaseMessage {
  command: 'SAVE_PRESETS_ORDER'
  presets: PresetMessageFormat[]
}

export interface SendPromptMessage extends BaseMessage {
  command: 'SEND_PROMPT'
  instruction: string
  preset_names: string[]
}

export interface CopyPromptMessage extends BaseMessage {
  command: 'COPY_PROMPT'
  instruction: string
}

export interface ShowErrorMessage extends BaseMessage {
  command: 'SHOW_ERROR'
  message: string
}

export interface ShowPresetPickerMessage extends BaseMessage {
  command: 'SHOW_PRESET_PICKER'
}

export interface OpenSettingsMessage extends BaseMessage {
  command: 'OPEN_SETTINGS'
}

export interface GetFimModeMessage extends BaseMessage {
  command: 'GET_FIM_MODE'
}

export interface SaveFimModeMessage extends BaseMessage {
  command: 'SAVE_FIM_MODE'
  enabled: boolean
}

export interface RequestEditorStateMessage extends BaseMessage {
  command: 'REQUEST_EDITOR_STATE'
}

export interface RequestEditorSelectionStateMessage extends BaseMessage {
  command: 'REQUEST_EDITOR_SELECTION_STATE'
}

export interface GetChatHistoryMessage extends BaseMessage {
  command: 'GET_CHAT_HISTORY'
}

export interface GetFimChatHistoryMessage extends BaseMessage {
  command: 'GET_FIM_CHAT_HISTORY'
}

export interface SaveChatHistoryMessage extends BaseMessage {
  command: 'SAVE_CHAT_HISTORY'
  messages: string[]
  is_fim_mode: boolean
}

export interface GetCurrentTokenCountMessage extends BaseMessage {
  command: 'GET_CURRENT_TOKEN_COUNT'
}

export interface UpdatePresetMessage extends BaseMessage {
  command: 'UPDATE_PRESET'
  original_name: string
  updated_preset: Preset
}

export interface DeletePresetMessage extends BaseMessage {
  command: 'DELETE_PRESET'
  name: string
}

export interface DuplicatePresetMessage extends BaseMessage {
  command: 'DUPLICATE_PRESET'
  name: string
}

export interface CreatePresetMessage extends BaseMessage {
  command: 'CREATE_PRESET'
}

export interface GetDefaultModelsMessage extends BaseMessage {
  command: 'GET_DEFAULT_MODELS'
}

export interface UpdateDefaultModelMessage extends BaseMessage {
  command: 'UPDATE_DEFAULT_MODEL'
  model_type:
    | 'code_completion'
    | 'refactoring'
    | 'apply_changes'
    | 'commit_message'
  model: string
}

export interface GetCustomProvidersMessage extends BaseMessage {
  command: 'GET_CUSTOM_PROVIDERS'
}

// Messages from extension to webview:
export interface ApiKeyUpdatedMessage extends BaseMessage {
  command: 'API_KEY_UPDATED'
  api_key: string
}

export interface ConnectionStatusMessage extends BaseMessage {
  command: 'CONNECTION_STATUS'
  connected: boolean
}

export interface PresetMessageFormat {
  name: string
  chatbot: keyof typeof CHATBOTS
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  system_instructions?: string
  options?: string[]
  port?: number
}

export interface PresetsMessage extends BaseMessage {
  command: 'PRESETS'
  presets: PresetMessageFormat[]
}

export interface SelectedPresetsMessage extends BaseMessage {
  command: 'SELECTED_PRESETS'
  names: string[]
}

export interface PresetsSelectedFromPickerMessage extends BaseMessage {
  command: 'PRESETS_SELECTED_FROM_PICKER'
  names: string[]
}

export interface ExpandedPresetsMessage extends BaseMessage {
  command: 'EXPANDED_PRESETS'
  indices: number[]
}

export interface FimModeMessage extends BaseMessage {
  command: 'FIM_MODE'
  enabled: boolean
}

export interface EditorStateChangedMessage extends BaseMessage {
  command: 'EDITOR_STATE_CHANGED'
  hasActiveEditor: boolean
}

export interface EditorSelectionChangedMessage extends BaseMessage {
  command: 'EDITOR_SELECTION_CHANGED'
  hasSelection: boolean
}

export interface ChatHistoryMessage extends BaseMessage {
  command: 'CHAT_HISTORY'
  messages: string[]
}

export interface FimChatHistoryMessage extends BaseMessage {
  command: 'FIM_CHAT_HISTORY'
  messages: string[]
}

export interface TokenCountMessage extends BaseMessage {
  command: 'TOKEN_COUNT_UPDATED'
  tokenCount: number
}

export interface SelectionTextMessage extends BaseMessage {
  command: 'SELECTION_TEXT_UPDATED'
  text: string
}

export interface ActiveFileInfoMessage extends BaseMessage {
  command: 'ACTIVE_FILE_INFO_UPDATED'
  fileLength: number
}

export interface PresetCreated extends BaseMessage {
  command: 'PRESET_CREATED'
  preset: Preset
}

export interface PresetUpdated extends BaseMessage {
  command: 'PRESET_UPDATED'
}

export interface DefaultModelsUpdatedMessage extends BaseMessage {
  command: 'DEFAULT_MODELS_UPDATED'
  default_code_completion_model: string
  default_refactoring_model: string
  default_apply_changes_model: string
  default_commit_message_model: string
}

export interface CustomProvidersUpdatedMessage extends BaseMessage {
  command: 'CUSTOM_PROVIDERS_UPDATED'
  custom_providers: Array<{
    name: string
    endpointUrl: string
    apiKey: string
    model: string
    temperature?: number
    systemInstructions?: string
  }>
}

// Union type of all possible incoming messages from webview
export type WebviewMessage =
  | GetApiKeyMessage
  | UpdateApiKeyMessage
  | SaveChatInstructionMessage
  | SaveFimInstructionMessage
  | GetConnectionStatusMessage
  | GetPresetsMessage
  | GetSelectedPresetsMessage
  | SaveSelectedPresetsMessage
  | SavePresetsOrderMessage
  | SendPromptMessage
  | CopyPromptMessage
  | ShowErrorMessage
  | ShowPresetPickerMessage
  | OpenSettingsMessage
  | GetFimModeMessage
  | SaveFimModeMessage
  | RequestEditorStateMessage
  | RequestEditorSelectionStateMessage
  | GetChatHistoryMessage
  | GetFimChatHistoryMessage
  | SaveChatHistoryMessage
  | GetCurrentTokenCountMessage
  | UpdatePresetMessage
  | DeletePresetMessage
  | DuplicatePresetMessage
  | CreatePresetMessage
  | GetDefaultModelsMessage
  | UpdateDefaultModelMessage
  | GetCustomProvidersMessage

export type ExtensionMessage =
  | ApiKeyUpdatedMessage
  | ConnectionStatusMessage
  | PresetsMessage
  | SelectedPresetsMessage
  | PresetsSelectedFromPickerMessage
  | ExpandedPresetsMessage
  | FimModeMessage
  | EditorStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | FimChatHistoryMessage
  | TokenCountMessage
  | SelectionTextMessage
  | ActiveFileInfoMessage
  | PresetCreated
  | PresetUpdated
  | DefaultModelsUpdatedMessage
  | CustomProvidersUpdatedMessage
