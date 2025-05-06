import { CHATBOTS } from '@shared/constants/chatbots'
import { ApiToolSettings } from '@shared/types/api-tool-settings'
import { EditFormat } from '@shared/types/edit-format'
import { Preset } from '@shared/types/preset'
import { EditFormatSelectorVisibility } from './edit-format-selector-visibility'

export interface BaseMessage {
  command: string
}

// Messages from webview to extension
export interface GetGeminiApiKeyMessage extends BaseMessage {
  command: 'GET_GEMINI_API_KEY'
}

export interface UpdateGeminiApiKeyMessage extends BaseMessage {
  command: 'UPDATE_GEMINI_API_KEY'
  api_key: string
}

export interface GetOpenRouterApiKeyMessage extends BaseMessage {
  command: 'GET_OPEN_ROUTER_API_KEY'
}

export interface UpdateOpenRouterApiKeyMessage extends BaseMessage {
  command: 'UPDATE_OPEN_ROUTER_API_KEY'
  api_key: string
}

export interface GetInstructionsMessage extends BaseMessage {
  command: 'GET_INSTRUCTIONS'
}

export interface GetCodeCompletionSuggestionsMessage extends BaseMessage {
  command: 'GET_CODE_COMPLETION_SUGGESTIONS'
}

export interface SaveInstructionsMessage extends BaseMessage {
  command: 'SAVE_INSTRUCTIONS'
  instruction: string
}

export interface SaveCodeCompletionSuggestionsMessage extends BaseMessage {
  command: 'SAVE_CODE_COMPLETION_SUGGESTIONS'
  instruction: string
}

export interface GetEditFormat extends BaseMessage {
  command: 'GET_EDIT_FORMAT'
}

export interface SaveEditFormatMessage extends BaseMessage {
  command: 'SAVE_EDIT_FORMAT'
  edit_format: EditFormat
}

export interface GetEditFormatSelectorVisibility extends BaseMessage {
  command: 'GET_EDIT_FORMAT_SELECTOR_VISIBILITY'
}

export interface SaveEditFormatSelectorVisibilityMessage extends BaseMessage {
  command: 'SAVE_EDIT_FORMAT_SELECTOR_VISIBILITY'
  visibility: 'visible' | 'hidden'
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
  preset_names: string[]
}

export interface CopyPromptMessage extends BaseMessage {
  command: 'COPY_PROMPT'
  instruction: string
}

export interface ShowPresetPickerMessage extends BaseMessage {
  command: 'SHOW_PRESET_PICKER'
}

export interface GetCodeCompletionsModeMessage extends BaseMessage {
  command: 'GET_CODE_COMPLETIONS_MODE'
}

export interface SaveCodeCompletionsModeMessage extends BaseMessage {
  command: 'SAVE_CODE_COMPLETIONS_MODE'
  enabled: boolean
}

export interface RequestEditorStateMessage extends BaseMessage {
  command: 'REQUEST_EDITOR_STATE'
}

export interface RequestEditorSelectionStateMessage extends BaseMessage {
  command: 'REQUEST_EDITOR_SELECTION_STATE'
}

export interface GetHistoryMessage extends BaseMessage {
  command: 'GET_HISTORY'
}

export interface GetCodeCompletionsHistoryMessage extends BaseMessage {
  command: 'GET_CODE_COMPLETIONS_HISTORY'
}

export interface SaveHistoryMessage extends BaseMessage {
  command: 'SAVE_HISTORY'
  messages: string[]
}

export interface GetCurrentTokenCountMessage extends BaseMessage {
  command: 'GET_CURRENT_TOKEN_COUNT'
}

export interface UpdatePresetMessage extends BaseMessage {
  command: 'UPDATE_PRESET'
  updating_preset: Preset
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

export interface GetCustomProvidersMessage extends BaseMessage {
  command: 'GET_CUSTOM_PROVIDERS'
}

export interface GetOpenRouterModelsMessage extends BaseMessage {
  command: 'GET_OPEN_ROUTER_MODELS'
}

export interface ShowOpenRouterModelPickerMessage extends BaseMessage {
  command: 'SHOW_OPEN_ROUTER_MODEL_PICKER'
  models: {
    id: string
    name: string
    description: string
  }[]
}

export interface GetApiToolCodeCompletionsSettingsMessage extends BaseMessage {
  command: 'GET_CODE_COMPLETIONS_SETTINGS'
}

export interface UpdateApiToolCodeCompletionsSettingsMessage
  extends BaseMessage {
  command: 'UPDATE_CODE_COMPLETIONS_SETTINGS'
  settings: ApiToolSettings
}

export interface GetApiToolFileRefactoringSettingsMessage extends BaseMessage {
  command: 'GET_FILE_REFACTORING_SETTINGS'
}

export interface UpdateApiToolFileRefactoringSettingsMessage
  extends BaseMessage {
  command: 'UPDATE_FILE_REFACTORING_SETTINGS'
  settings: ApiToolSettings
}

export interface GetApiToolCommitMessageSettingsMessage extends BaseMessage {
  command: 'GET_COMMIT_MESSAGES_SETTINGS'
}

export interface UpdateApiToolCommitMessageSettingsMessage extends BaseMessage {
  command: 'UPDATE_COMMIT_MESSAGES_SETTINGS'
  settings: ApiToolSettings
}

export interface ExecuteCommandMessage extends BaseMessage {
  command: 'EXECUTE_COMMAND'
  command_id: string
}

export interface ShowQuickPickMessage extends BaseMessage {
  command: 'SHOW_QUICK_PICK'
  title: string
  items: {
    label: string
    description: string
    command: string
  }[]
}

export interface PreviewPresetMessage extends BaseMessage {
  command: 'PREVIEW_PRESET'
  preset: Preset
}

export interface GetSelectedCodeCompletionPresetsMessage extends BaseMessage {
  command: 'GET_SELECTED_CODE_COMPLETION_PRESETS'
}

export interface SaveSelectedCodeCompletionPresetsMessage extends BaseMessage {
  command: 'SAVE_SELECTED_CODE_COMPLETION_PRESETS'
  names: string[]
}

// Messages from extension to webview:
export interface GeminiApiKeyMessage extends BaseMessage {
  command: 'GEMINI_API_KEY'
  api_key: string
}

export interface OpenRouterApiKeyMessage extends BaseMessage {
  command: 'OPEN_ROUTER_API_KEY'
  api_key: string
}

export interface InstructionsMessage extends BaseMessage {
  command: 'INSTRUCTIONS'
  value: string
}

export interface CodeCompletionSuggestionsMessage extends BaseMessage {
  command: 'CODE_COMPLETION_SUGGESTIONS'
  value: string
}

export interface ConnectionStatusMessage extends BaseMessage {
  command: 'CONNECTION_STATUS'
  connected: boolean
}

export interface EditFormatMessage extends BaseMessage {
  command: 'EDIT_FORMAT'
  edit_format: EditFormat
}

export interface EditFormatSelectorVisibilityMessage extends BaseMessage {
  command: 'EDIT_FORMAT_SELECTOR_VISIBILITY'
  visibility: EditFormatSelectorVisibility
}

export interface PresetMessageFormat {
  name: string
  chatbot: keyof typeof CHATBOTS
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  top_p?: number
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

export interface CodeCompletionsModeMessage extends BaseMessage {
  command: 'CODE_COMPLETIONS_MODE'
  enabled: boolean
}

export interface EditorStateChangedMessage extends BaseMessage {
  command: 'EDITOR_STATE_CHANGED'
  has_active_editor: boolean
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

export interface PresetCreatedMessage extends BaseMessage {
  command: 'PRESET_CREATED'
  preset: Preset
}

export interface PresetUpdatedMessage extends BaseMessage {
  command: 'PRESET_UPDATED'
}

export interface CustomProvidersUpdatedMessage extends BaseMessage {
  command: 'CUSTOM_PROVIDERS_UPDATED'
  custom_providers: Array<{
    name: string
    endpointUrl: string
    apiKey: string
    model: string
    temperature?: number
    top_p?: number
    systemInstructions?: string
  }>
}

export interface OpenRouterModelsMessage extends BaseMessage {
  command: 'OPEN_ROUTER_MODELS'
  models: {
    [model_id: string]: {
      name: string
      description: string
    }
  }
}

export interface OpenRouterModelSelectedMessage extends BaseMessage {
  command: 'OPEN_ROUTER_MODEL_SELECTED'
  model_id: string | undefined
}

export interface ApiToolCodeCompletionsSettingsMessage extends BaseMessage {
  command: 'CODE_COMPLETIONS_SETTINGS'
  settings: ApiToolSettings
}

export interface ApiToolFileRefactoringSettingsMessage extends BaseMessage {
  command: 'FILE_REFACTORING_SETTINGS'
  settings: ApiToolSettings
}

export interface ApiToolCommitMessageSettingsMessage extends BaseMessage {
  command: 'COMMIT_MESSAGES_SETTINGS'
  settings: ApiToolSettings
}

export interface SelectedCodeCompletionPresetsMessage extends BaseMessage {
  command: 'SELECTED_CODE_COMPLETION_PRESETS'
  names: string[]
}

// Union type of all possible incoming messages from webview
export type WebviewMessage =
  | GetGeminiApiKeyMessage
  | UpdateGeminiApiKeyMessage
  | GetOpenRouterApiKeyMessage
  | UpdateOpenRouterApiKeyMessage
  | GetInstructionsMessage
  | GetCodeCompletionSuggestionsMessage
  | SaveInstructionsMessage
  | SaveCodeCompletionSuggestionsMessage
  | GetEditFormat
  | SaveEditFormatMessage
  | GetEditFormatSelectorVisibility // Added
  | SaveEditFormatSelectorVisibilityMessage // Added
  | GetConnectionStatusMessage
  | GetPresetsMessage
  | GetSelectedPresetsMessage
  | SaveSelectedPresetsMessage
  | SavePresetsOrderMessage
  | SendPromptMessage
  | CopyPromptMessage
  | ShowPresetPickerMessage
  | GetCodeCompletionsModeMessage
  | SaveCodeCompletionsModeMessage
  | RequestEditorStateMessage
  | RequestEditorSelectionStateMessage
  | GetHistoryMessage
  | GetCodeCompletionsHistoryMessage
  | SaveHistoryMessage
  | GetCurrentTokenCountMessage
  | UpdatePresetMessage
  | DeletePresetMessage
  | DuplicatePresetMessage
  | CreatePresetMessage
  | GetCustomProvidersMessage
  | GetOpenRouterModelsMessage
  | ShowOpenRouterModelPickerMessage
  | GetApiToolCodeCompletionsSettingsMessage
  | UpdateApiToolCodeCompletionsSettingsMessage
  | GetApiToolFileRefactoringSettingsMessage
  | UpdateApiToolFileRefactoringSettingsMessage
  | GetApiToolCommitMessageSettingsMessage
  | UpdateApiToolCommitMessageSettingsMessage
  | ExecuteCommandMessage
  | ShowQuickPickMessage
  | PreviewPresetMessage
  | GetSelectedCodeCompletionPresetsMessage
  | SaveSelectedCodeCompletionPresetsMessage

export type ExtensionMessage =
  | GeminiApiKeyMessage
  | OpenRouterApiKeyMessage
  | InstructionsMessage
  | CodeCompletionSuggestionsMessage
  | ConnectionStatusMessage
  | EditFormatMessage
  | EditFormatSelectorVisibilityMessage // Added
  | PresetsMessage
  | SelectedPresetsMessage
  | PresetsSelectedFromPickerMessage
  | ExpandedPresetsMessage
  | CodeCompletionsModeMessage
  | EditorStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | FimChatHistoryMessage
  | TokenCountMessage
  | SelectionTextMessage
  | ActiveFileInfoMessage
  | PresetCreatedMessage
  | PresetUpdatedMessage
  | CustomProvidersUpdatedMessage
  | OpenRouterModelsMessage
  | OpenRouterModelSelectedMessage
  | ApiToolCodeCompletionsSettingsMessage
  | ApiToolFileRefactoringSettingsMessage
  | ApiToolCommitMessageSettingsMessage
  | SelectedCodeCompletionPresetsMessage
