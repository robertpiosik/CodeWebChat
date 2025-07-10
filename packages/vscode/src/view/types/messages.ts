import { CHATBOTS } from '@shared/constants/chatbots'
import { EditFormat } from '@shared/types/edit-format'
import { Preset } from '@shared/types/preset'
import { PROVIDERS } from '@shared/constants/providers'
import { HomeViewType } from './home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'

export interface BaseMessage {
  command: string
}

// Messages from webview to extension
export interface GetInstructionsMessage extends BaseMessage {
  command: 'GET_INSTRUCTIONS'
}

export interface SaveInstructionsMessage extends BaseMessage {
  command: 'SAVE_INSTRUCTIONS'
  instruction: string
  mode: 'ask' | 'edit' | 'no-context' | 'code-completions'
}

export interface GetEditFormat extends BaseMessage {
  command: 'GET_EDIT_FORMAT'
}

export interface SaveEditFormatMessage extends BaseMessage {
  command: 'SAVE_EDIT_FORMAT'
  edit_format: EditFormat
  target: 'chat' | 'api'
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
  presets: Preset[]
}

export interface SendPromptMessage extends BaseMessage {
  command: 'SEND_PROMPT'
  preset_names: string[]
}

export interface CopyPromptMessage extends BaseMessage {
  command: 'COPY_PROMPT'
  instruction: string
  preset_name?: string
}

export interface ShowPresetPickerMessage extends BaseMessage {
  command: 'SHOW_PRESET_PICKER'
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

export interface SaveHistoryMessage extends BaseMessage {
  command: 'SAVE_HISTORY'
  messages: string[]
  mode: 'ask' | 'edit' | 'no-context' | 'code-completions'
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

export interface ExecuteCommandMessage extends BaseMessage {
  command: 'EXECUTE_COMMAND'
  command_id: string
}

export interface ShowQuickPickMessage extends BaseMessage {
  command: 'SHOW_QUICK_PICK'
  title: string
  items: {
    label: string
    description?: string
    detail?: string
    command: string
  }[]
}

export interface ShowHistoryQuickPickMessage extends BaseMessage {
  command: 'SHOW_HISTORY_QUICK_PICK'
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

export interface CaretPositionChangedWebviewMessage extends BaseMessage {
  command: 'CARET_POSITION_CHANGED'
  caret_position: number
}

export interface PickOpenRouterModel extends BaseMessage {
  command: 'PICK_OPEN_ROUTER_MODEL'
}

export interface SaveHomeViewTypeMessage extends BaseMessage {
  command: 'SAVE_HOME_VIEW_TYPE'
  view_type: HomeViewType
}

export interface GetHomeViewTypeMessage extends BaseMessage {
  command: 'GET_HOME_VIEW_TYPE'
}

export interface EditContextMessage extends BaseMessage {
  command: 'EDIT_CONTEXT'
  use_quick_pick: boolean
}

export interface CodeCompletionMessage extends BaseMessage {
  command: 'CODE_COMPLETION'
  use_quick_pick: boolean
}

export interface ShowAtSignQuickPickMessage extends BaseMessage {
  command: 'SHOW_AT_SIGN_QUICK_PICK'
}

export interface GetWebModeMessage extends BaseMessage {
  command: 'GET_WEB_MODE'
}

export interface SaveWebModeMessage extends BaseMessage {
  command: 'SAVE_WEB_MODE'
  mode: WebMode
}

export interface GetApiModeMessage extends BaseMessage {
  command: 'GET_API_MODE'
}

export interface SaveApiModeMessage extends BaseMessage {
  command: 'SAVE_API_MODE'
  mode: ApiMode
}

// Messages from extension to webview:
export interface InstructionsMessage extends BaseMessage {
  command: 'INSTRUCTIONS'
  ask: string
  edit: string
  no_context: string
  code_completions: string
}

export interface ConnectionStatusMessage extends BaseMessage {
  command: 'CONNECTION_STATUS'
  connected: boolean
}

export interface EditFormatMessage extends BaseMessage {
  command: 'EDIT_FORMAT'
  chat_edit_format: EditFormat
  api_edit_format: EditFormat
}

export interface PresetMessageFormat {
  name: string
  chatbot: keyof typeof CHATBOTS
  prompt_prefix?: string
  prompt_suffix?: string
  model?: string
  temperature?: number
  top_p?: number
  thinking_budget?: number
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
  has_selection: boolean
}

export interface ChatHistoryMessage extends BaseMessage {
  command: 'CHAT_HISTORY'
  ask: string[]
  edit: string[]
  no_context: string[]
  code_completions: string[]
}

export interface TokenCountMessage extends BaseMessage {
  command: 'TOKEN_COUNT_UPDATED'
  token_count: number
}

export interface SelectionTextMessage extends BaseMessage {
  command: 'SELECTION_TEXT_UPDATED'
  text: string
}

export interface PresetCreatedMessage extends BaseMessage {
  command: 'PRESET_CREATED'
  preset: Preset
}

export interface PresetUpdatedMessage extends BaseMessage {
  command: 'PRESET_UPDATED'
}

export interface NewlyPickedOpenRouterModelMessage extends BaseMessage {
  command: 'NEWLY_PICKED_OPEN_ROUTER_MODEL'
  model_id: string
}

export interface SelectedCodeCompletionPresetsMessage extends BaseMessage {
  command: 'SELECTED_CODE_COMPLETION_PRESETS'
  names: string[]
}

export interface ApiProvidersMessage extends BaseMessage {
  command: 'PROVIDERS'
  providers: Array<
    | {
        type: 'built-in'
        id: keyof typeof PROVIDERS
        api_key: string
      }
    | {
        type: 'custom'
        name: string
        base_url: string
        api_key: string
      }
  >
}

export interface HomeViewTypeMessage extends BaseMessage {
  command: 'HOME_VIEW_TYPE'
  view_type: HomeViewType
}

export interface WebModeMessage extends BaseMessage {
  command: 'WEB_MODE'
  mode: WebMode
}

export interface ApiModeMessage extends BaseMessage {
  command: 'API_MODE'
  mode: ApiMode
}

// Union type of all possible incoming messages from webview
export type WebviewMessage =
  | GetInstructionsMessage
  | SaveInstructionsMessage
  | GetEditFormat
  | SaveEditFormatMessage
  | GetConnectionStatusMessage
  | GetPresetsMessage
  | GetSelectedPresetsMessage
  | SaveSelectedPresetsMessage
  | SavePresetsOrderMessage
  | SendPromptMessage
  | CopyPromptMessage
  | ShowPresetPickerMessage
  | RequestEditorStateMessage
  | RequestEditorSelectionStateMessage
  | GetHistoryMessage
  | SaveHistoryMessage
  | GetCurrentTokenCountMessage
  | UpdatePresetMessage
  | DeletePresetMessage
  | DuplicatePresetMessage
  | CreatePresetMessage
  | ExecuteCommandMessage
  | ShowHistoryQuickPickMessage
  | ShowQuickPickMessage
  | PreviewPresetMessage
  | GetSelectedCodeCompletionPresetsMessage
  | SaveSelectedCodeCompletionPresetsMessage
  | CaretPositionChangedWebviewMessage
  | PickOpenRouterModel
  | SaveHomeViewTypeMessage
  | GetHomeViewTypeMessage
  | EditContextMessage
  | CodeCompletionMessage
  | ShowAtSignQuickPickMessage
  | SaveWebModeMessage
  | GetWebModeMessage
  | GetApiModeMessage
  | SaveApiModeMessage

export type ExtensionMessage =
  | InstructionsMessage
  | ConnectionStatusMessage
  | EditFormatMessage
  | PresetsMessage
  | SelectedPresetsMessage
  | PresetsSelectedFromPickerMessage
  | ExpandedPresetsMessage
  | CodeCompletionsModeMessage
  | EditorStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | TokenCountMessage
  | SelectionTextMessage
  | PresetCreatedMessage
  | PresetUpdatedMessage
  | NewlyPickedOpenRouterModelMessage
  | SelectedCodeCompletionPresetsMessage
  | ExecuteCommandMessage
  | ApiProvidersMessage
  | HomeViewTypeMessage
  | WebModeMessage
  | ApiModeMessage
