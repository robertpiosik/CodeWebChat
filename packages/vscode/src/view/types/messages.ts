import { EditFormat } from '@shared/types/edit-format'
import { Preset } from '@shared/types/preset'
import { HomeViewType } from './home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'

export interface BaseMessage {
  command: string
}

export type ApiToolConfiguration = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
  reasoning_effort?: string
  max_concurrency?: number
  is_default?: boolean
}

// Messages sent to the backend
export interface GetInstructionsMessage extends BaseMessage {
  command: 'GET_INSTRUCTIONS'
}

export interface SaveInstructionsMessage extends BaseMessage {
  command: 'SAVE_INSTRUCTIONS'
  instruction: string
  mode: 'ask' | 'edit-context' | 'no-context' | 'code-completions'
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
  instructions: string
  preset_name?: string
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
  mode: 'ask' | 'edit-context' | 'no-context' | 'code-completions'
}

export interface GetCurrentTokenCountMessage extends BaseMessage {
  command: 'GET_CURRENT_TOKEN_COUNT'
}

export interface UpdatePresetMessage extends BaseMessage {
  command: 'UPDATE_PRESET'
  updating_preset: Preset
  updated_preset: Preset
  origin: 'back_button' | 'save_button'
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

export interface ShowHistoryQuickPickMessage extends BaseMessage {
  command: 'SHOW_HISTORY_QUICK_PICK'
}

export interface ShowPromptTemplateQuickPickMessage extends BaseMessage {
  command: 'SHOW_PROMPT_TEMPLATE_QUICK_PICK'
}

export interface PreviewPresetMessage extends BaseMessage {
  command: 'PREVIEW_PRESET'
  preset: Preset
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
  config_index?: number
}

export interface CodeCompletionMessage extends BaseMessage {
  command: 'CODE_COMPLETION'
  use_quick_pick: boolean
  config_index?: number
}

export interface ShowAtSignQuickPickMessage extends BaseMessage {
  command: 'SHOW_AT_SIGN_QUICK_PICK'
}

export interface ShowAtSignQuickPickForPresetAffixMessage extends BaseMessage {
  command: 'SHOW_AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX'
  is_for_code_completions: boolean
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

export interface GetApiToolConfigurationsMessage extends BaseMessage {
  command: 'GET_API_TOOL_CONFIGURATIONS'
}

export interface GetVersionMessage extends BaseMessage {
  command: 'GET_VERSION'
}

export type FrontendMessage =
  | GetInstructionsMessage
  | SaveInstructionsMessage
  | GetEditFormat
  | SaveEditFormatMessage
  | GetConnectionStatusMessage
  | GetPresetsMessage
  | SavePresetsOrderMessage
  | SendPromptMessage
  | CopyPromptMessage
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
  | ShowPromptTemplateQuickPickMessage
  | PreviewPresetMessage
  | CaretPositionChangedWebviewMessage
  | PickOpenRouterModel
  | SaveHomeViewTypeMessage
  | GetHomeViewTypeMessage
  | EditContextMessage
  | CodeCompletionMessage
  | ShowAtSignQuickPickMessage
  | ShowAtSignQuickPickForPresetAffixMessage
  | SaveWebModeMessage
  | GetWebModeMessage
  | GetApiModeMessage
  | SaveApiModeMessage
  | GetApiToolConfigurationsMessage
  | GetVersionMessage

// Messages sent to the frontend
export interface InstructionsMessage extends BaseMessage {
  command: 'INSTRUCTIONS'
  ask: string
  edit_context: string
  no_context: string
  code_completions: string
  caret_position?: number
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

export interface PresetsMessage extends BaseMessage {
  command: 'PRESETS'
  presets: { [T in WebMode]: Preset[] }
}

export interface ApiToolConfigurationsMessage extends BaseMessage {
  command: 'API_TOOL_CONFIGURATIONS'
  configurations: { [T in ApiMode]?: ApiToolConfiguration[] }
}

export interface SelectedPresetsMessage extends BaseMessage {
  command: 'SELECTED_PRESETS'
  names: string[]
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
  edit_context: string[]
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

export interface VersionMessage extends BaseMessage {
  command: 'VERSION'
  version: string
}

export interface AtSignQuickPickForPresetAffixResultMessage
  extends BaseMessage {
  command: 'AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX_RESULT'
  text_to_insert: string
}

export type BackendMessage =
  | InstructionsMessage
  | ConnectionStatusMessage
  | EditFormatMessage
  | ApiToolConfigurationsMessage
  | PresetsMessage
  | SelectedPresetsMessage
  | EditorStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | TokenCountMessage
  | SelectionTextMessage
  | PresetCreatedMessage
  | PresetUpdatedMessage
  | NewlyPickedOpenRouterModelMessage
  | HomeViewTypeMessage
  | WebModeMessage
  | ApiModeMessage
  | VersionMessage
  | AtSignQuickPickForPresetAffixResultMessage
