// Base message interface that all other messages will extend
export interface BaseMessage {
  command: string
}

// Messages from webview to extension
export interface GetLastPromptMessage extends BaseMessage {
  command: 'GET_LAST_PROMPT'
}

export interface GetLastFimPromptMessage extends BaseMessage {
  command: 'GET_LAST_FIM_PROMPT'
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

export interface GetExpandedPresetsMessage extends BaseMessage {
  command: 'GET_EXPANDED_PRESETS'
}

export interface SaveExpandedPresetsMessage extends BaseMessage {
  command: 'SAVE_EXPANDED_PRESETS'
  indices: number[]
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
  instruction: string
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

/**
 * Messages from extension to webview:
 */
export interface InitialPromptMessage extends BaseMessage {
  command: 'INITIAL_PROMPT'
  instruction: string
}

export interface InitialFimPromptMessage extends BaseMessage {
  command: 'INITIAL_FIM_PROMPT'
  instruction: string
}

export interface ConnectionStatusMessage extends BaseMessage {
  command: 'CONNECTION_STATUS'
  connected: boolean
}

export interface PresetMessageFormat {
  name: string
  chatbot: string
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  system_instructions?: string
  options?: string[]
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

// Union type of all possible incoming messages from webview
export type WebviewMessage =
  | GetLastPromptMessage
  | GetLastFimPromptMessage
  | SaveChatInstructionMessage
  | SaveFimInstructionMessage
  | GetConnectionStatusMessage
  | GetPresetsMessage
  | GetSelectedPresetsMessage
  | SaveSelectedPresetsMessage
  | GetExpandedPresetsMessage
  | SaveExpandedPresetsMessage
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

// Union type of all possible outgoing messages to webview
export type ExtensionMessage =
  | InitialPromptMessage
  | InitialFimPromptMessage
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
