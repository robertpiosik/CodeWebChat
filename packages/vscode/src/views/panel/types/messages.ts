import { EditFormat } from '@shared/types/edit-format'
import { FileInReview } from '@shared/types/file-in-review'
import { Preset } from '@shared/types/preset'
import { HomeViewType } from './home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { InstructionsPlacement } from '@/services/model-providers-manager'

export interface BaseMessage {
  command: string
}

export type ApiToolConfiguration = {
  id: string
  provider_type: string
  provider_name: string
  model: string
  temperature: number
  reasoning_effort?: string
  instructions_placement?: InstructionsPlacement
  is_default?: boolean
}

export type FileProgressStatus =
  | 'waiting'
  | 'thinking'
  | 'receiving'
  | 'done'
  | 'error'

export type FileProgress = {
  file_path: string
  workspace_name?: string
  status: FileProgressStatus
  progress?: number
  tokens_per_second?: number
}

// === FROM FRONTEND TO BACKEND ===
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

export interface GetEditFormatInstructionsMessage extends BaseMessage {
  command: 'GET_EDIT_FORMAT_INSTRUCTIONS'
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

export interface ReplacePresetsMessage extends BaseMessage {
  command: 'REPLACE_PRESETS'
  presets: Preset[]
}

export interface SendPromptMessage extends BaseMessage {
  command: 'SEND_PROMPT'
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
  without_submission?: boolean
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

export interface PickChatbotMessage extends BaseMessage {
  command: 'PICK_CHATBOT'
  chatbot_id?: string
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
  config_id?: string
}

export interface CodeCompletionMessage extends BaseMessage {
  command: 'CODE_COMPLETION'
  use_quick_pick: boolean
  config_id?: string
}

export interface ShowAtSignQuickPickMessage extends BaseMessage {
  command: 'SHOW_AT_SIGN_QUICK_PICK'
  is_for_code_completions: boolean
}

export interface CancelApiRequestMessage extends BaseMessage {
  command: 'CANCEL_API_REQUEST'
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

export interface ReorderApiToolConfigurationsMessage extends BaseMessage {
  command: 'REORDER_API_TOOL_CONFIGURATIONS'
  mode: ApiMode
  configurations: ApiToolConfiguration[]
}

export interface GetVersionMessage extends BaseMessage {
  command: 'GET_VERSION'
}

export interface CheckClipboardForApplyMessage extends BaseMessage {
  command: 'CHECK_CLIPBOARD_FOR_APPLY'
}

export interface EditsReviewMessage extends BaseMessage {
  command: 'EDITS_REVIEW'
  files: FileInReview[]
}

export interface ToggleFileInReviewMessage extends BaseMessage {
  command: 'TOGGLE_FILE_IN_REVIEW'
  file_path: string
  workspace_name?: string
  is_checked: boolean
}

export interface FocusOnFileInReviewMessage extends BaseMessage {
  command: 'FOCUS_ON_FILE_IN_REVIEW'
  file_path: string
  workspace_name?: string
}

export interface GoToFileInReviewMessage extends BaseMessage {
  command: 'GO_TO_FILE_IN_REVIEW'
  file_path: string
  workspace_name?: string
}

export interface GetWorkspaceStateMessage extends BaseMessage {
  command: 'GET_WORKSPACE_STATE'
}

export interface RequestGitStateMessage extends BaseMessage {
  command: 'REQUEST_GIT_STATE'
}

export interface UpdateLastUsedPresetMessage extends BaseMessage {
  command: 'UPDATE_LAST_USED_PRESET'
  preset_name: string
}

export interface GetDonationsVisibilityMessage extends BaseMessage {
  command: 'GET_DONATIONS_VISIBILITY'
}

export interface SaveDonationsVisibilityMessage extends BaseMessage {
  command: 'SAVE_DONATIONS_VISIBILITY'
  is_visible: boolean
}

export interface IntelligentUpdateFileInReviewMessage extends BaseMessage {
  command: 'INTELLIGENT_UPDATE_FILE_IN_REVIEW'
  file_path: string
  workspace_name?: string
}

export interface CommitChangesMessage extends BaseMessage {
  command: 'COMMIT_CHANGES'
}

export interface AcceptCommitMessage extends BaseMessage {
  command: 'ACCEPT_COMMIT_MESSAGE'
  commit_message: string
}

export interface CancelCommitMessage extends BaseMessage {
  command: 'CANCEL_COMMIT_MESSAGE'
}

export interface ManageConfigurationsMessage extends BaseMessage {
  command: 'MANAGE_CONFIGURATIONS'
  api_mode: ApiMode
}

export type FrontendMessage =
  | GetInstructionsMessage
  | SaveInstructionsMessage
  | GetEditFormat
  | GetEditFormatInstructionsMessage
  | SaveEditFormatMessage
  | GetConnectionStatusMessage
  | GetDonationsVisibilityMessage
  | GetPresetsMessage
  | ReplacePresetsMessage
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
  | PickChatbotMessage
  | SaveHomeViewTypeMessage
  | GetHomeViewTypeMessage
  | EditContextMessage
  | CancelApiRequestMessage
  | CodeCompletionMessage
  | ShowAtSignQuickPickMessage
  | ShowAtSignQuickPickForPresetAffixMessage
  | SaveWebModeMessage
  | GetWebModeMessage
  | GetApiModeMessage
  | SaveApiModeMessage
  | GetApiToolConfigurationsMessage
  | ReorderApiToolConfigurationsMessage
  | SaveDonationsVisibilityMessage
  | GetVersionMessage
  | CheckClipboardForApplyMessage
  | EditsReviewMessage
  | ToggleFileInReviewMessage
  | FocusOnFileInReviewMessage
  | GoToFileInReviewMessage
  | GetWorkspaceStateMessage
  | RequestGitStateMessage
  | IntelligentUpdateFileInReviewMessage
  | UpdateLastUsedPresetMessage
  | CommitChangesMessage
  | AcceptCommitMessage
  | CancelCommitMessage
  | ManageConfigurationsMessage

// === FROM BACKEND TO FRONTEND ===
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

export interface EditFormatInstructionsMessage extends BaseMessage {
  command: 'EDIT_FORMAT_INSTRUCTIONS'
  instructions: Record<EditFormat, string>
}

export interface PresetsMessage extends BaseMessage {
  command: 'PRESETS'
  presets: { [T in WebMode]: Preset[] }
  selected_preset_or_group_name_by_mode?: { [T in WebMode]?: string }
  selected_configuration_id_by_mode?: { [T in ApiMode]?: string }
}

export interface ApiToolConfigurationsMessage extends BaseMessage {
  command: 'API_TOOL_CONFIGURATIONS'
  configurations: { [T in ApiMode]?: ApiToolConfiguration[] }
}

export interface EditorStateChangedMessage extends BaseMessage {
  command: 'EDITOR_STATE_CHANGED'
  has_active_editor: boolean
}

export interface EditorSelectionChangedMessage extends BaseMessage {
  command: 'EDITOR_SELECTION_CHANGED'
  has_selection: boolean
}

export interface GitStateChangedMessage extends BaseMessage {
  command: 'GIT_STATE_CHANGED'
  has_changes_to_commit: boolean
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

export interface NewlyPickedChatbotMessage extends BaseMessage {
  command: 'NEWLY_PICKED_CHATBOT'
  chatbot_id: string
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

export interface CanApplyClipboardChangedMessage extends BaseMessage {
  command: 'CAN_APPLY_CLIPBOARD_CHANGED'
  can_apply: boolean
}

export interface CanUndoChangedMessage extends BaseMessage {
  command: 'CAN_UNDO_CHANGED'
  can_undo: boolean
}

export interface CodeReviewStartedMessage extends BaseMessage {
  command: 'CODE_REVIEW_STARTED'
  files: FileInReview[]
  raw_instructions?: string
}

export interface CodeReviewFinishedMessage extends BaseMessage {
  command: 'CODE_REVIEW_FINISHED'
}

export interface WorkspaceStateMessage extends BaseMessage {
  command: 'WORKSPACE_STATE'
  folder_count: number
}

export interface SelectedPresetOrGroupChangedMessage extends BaseMessage {
  command: 'SELECTED_PRESET_OR_GROUP_CHANGED'
  mode: WebMode
  name?: string
}

export interface SelectedConfigurationChangedMessage extends BaseMessage {
  command: 'SELECTED_CONFIGURATION_CHANGED'
  mode: ApiMode
  id: string
}

export interface FocusChatInputMessage extends BaseMessage {
  command: 'FOCUS_CHAT_INPUT'
}

export interface DonationsVisibilityMessage extends BaseMessage {
  command: 'DONATIONS_VISIBILITY'
  is_visible: boolean
}

export interface ShowProgressMessage extends BaseMessage {
  command: 'SHOW_PROGRESS'
  title: string
  progress?: number
  tokens_per_second?: number
  files?: FileProgress[]
}

export interface HideProgressMessage extends BaseMessage {
  command: 'HIDE_PROGRESS'
}

export interface ShowChatInitializedMessage extends BaseMessage {
  command: 'SHOW_CHAT_INITIALIZED'
  title: string
}

export interface UpdateFileInReviewMessage extends BaseMessage {
  command: 'UPDATE_FILE_IN_REVIEW'
  file: FileInReview
}

export interface ShowCommitMessageModalMessage extends BaseMessage {
  command: 'SHOW_COMMIT_MESSAGE_MODAL'
  commit_message: string
}

export interface CommitProcessCancelledMessage extends BaseMessage {
  command: 'COMMIT_PROCESS_CANCELLED'
}

export type BackendMessage =
  | InstructionsMessage
  | FocusChatInputMessage
  | ConnectionStatusMessage
  | EditFormatMessage
  | EditFormatInstructionsMessage
  | ApiToolConfigurationsMessage
  | DonationsVisibilityMessage
  | PresetsMessage
  | EditorStateChangedMessage
  | GitStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | TokenCountMessage
  | PresetCreatedMessage
  | PresetUpdatedMessage
  | NewlyPickedOpenRouterModelMessage
  | NewlyPickedChatbotMessage
  | HomeViewTypeMessage
  | WebModeMessage
  | ApiModeMessage
  | VersionMessage
  | AtSignQuickPickForPresetAffixResultMessage
  | CanApplyClipboardChangedMessage
  | CanUndoChangedMessage
  | CodeReviewStartedMessage
  | CodeReviewFinishedMessage
  | WorkspaceStateMessage
  | SelectedPresetOrGroupChangedMessage
  | SelectedConfigurationChangedMessage
  | ShowProgressMessage
  | HideProgressMessage
  | ShowChatInitializedMessage
  | UpdateFileInReviewMessage
  | ShowCommitMessageModalMessage
  | CommitProcessCancelledMessage
