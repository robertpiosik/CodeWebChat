import { EditFormat } from '@shared/types/edit-format'
import {
  FileInPreview,
  RelevantFileInPreview,
  ItemInPreview
} from '@shared/types/file-in-preview'
import {
  ResponseHistoryItem,
  RecentApiConfiguration
} from '@shared/types/response-history-item'
import { WebConfiguration } from '@shared/types/web-configuration'
import { Task } from '@shared/types/task'
import { Mode } from './main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { ToolType } from '@/views/settings/types/tools'

export interface BaseMessage {
  command: string
}

export type InstructionsState = {
  instructions: string[]
  active_index: number
}

export type SetupProgress = {
  has_model_provider: boolean
  has_api_configuration: boolean
}

export interface PreviewGeneratedCodeMessage extends BaseMessage {
  command: 'PREVIEW_GENERATED_CODE'
  file_path: string
  workspace_name?: string
  content: string
}

export type SelectionState = {
  text: string
  start_line: number
  start_col: number
  end_line: number
  end_col: number
}

export type ApiConfiguration = {
  id: string
  model_provider_name: string
  model: string
  temperature?: number
  reasoning_effort?: string
  is_pinned?: boolean
}

export type CheckpointTrigger =
  | 'manual'
  | 'response-accepted'
  | 'before-response-previewed'
  | 'before-checkpoint-restored'
  | 'temporary'

export type Checkpoint = {
  timestamp: number
  trigger: CheckpointTrigger
  description?: string
  is_starred?: boolean
}

export type FileProgressStatus = 'waiting' | 'thinking' | 'receiving'

// === FROM FRONTEND TO BACKEND ===
export interface GetInstructionsMessage extends BaseMessage {
  command: 'GET_INSTRUCTIONS'
}

export interface SaveInstructionsMessage extends BaseMessage {
  command: 'SAVE_INSTRUCTIONS'
  instruction: InstructionsState
  prompt_type:
    | 'ask-about-context'
    | 'edit-context'
    | 'code-at-cursor'
    | 'find-relevant-files'
    | 'no-context'
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

export interface GetWebConfigurationsMessage extends BaseMessage {
  command: 'GET_WEB_CONFIGURATIONS'
}

export interface ReorderWebConfigurationsMessage extends BaseMessage {
  command: 'REORDER_WEB_CONFIGURATIONS'
  web_configurations: WebConfiguration[]
}

export interface TogglePinnedWebConfigurationMessage extends BaseMessage {
  command: 'TOGGLE_PINNED_WEB_CONFIGURATION'
  web_configuration_name: string
}

export interface SendToBrowserMessage extends BaseMessage {
  command: 'SEND_TO_BROWSER'
  invocation_count: number
  web_configuration_name?: string
  show_quick_pick?: boolean
}

export interface CopyPromptMessage extends BaseMessage {
  command: 'COPY_PROMPT'
  instructions: string
  web_configuration_name?: string
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

export interface GetResponseHistoryMessage extends BaseMessage {
  command: 'GET_RESPONSE_HISTORY'
}

export interface SaveHistoryMessage extends BaseMessage {
  command: 'SAVE_HISTORY'
  messages: string[]
  prompt_type:
    | 'ask-about-context'
    | 'edit-context'
    | 'code-at-cursor'
    | 'find-relevant-files'
    | 'no-context'
}

export interface GetContextSizeWarningThresholdMessage extends BaseMessage {
  command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD'
}

export interface CreateWebConfigurationMessage extends BaseMessage {
  command: 'CREATE_WEB_CONFIGURATION'
  placement?: 'top' | 'bottom'
  reference_index?: number
}

export interface UpdateWebConfigurationMessage extends BaseMessage {
  command: 'UPDATE_WEB_CONFIGURATION'
  updating_web_configuration: WebConfiguration
  updated_web_configuration: WebConfiguration
  origin?: 'back_button' | 'save_button'
}

export interface DeleteWebConfigurationMessage extends BaseMessage {
  command: 'DELETE_WEB_CONFIGURATION'
  name: string
}

export interface DuplicateWebConfigurationMessage extends BaseMessage {
  command: 'DUPLICATE_WEB_CONFIGURATION'
  name: string
}

export interface ExecuteCommandMessage extends BaseMessage {
  command: 'EXECUTE_COMMAND'
  command_id: string
}

export interface ShowPromptTemplateQuickPickMessage extends BaseMessage {
  command: 'SHOW_PROMPT_TEMPLATE_QUICK_PICK'
}

export interface PreviewWebConfigurationMessage extends BaseMessage {
  command: 'PREVIEW_WEB_CONFIGURATION'
  web_configuration: WebConfiguration
}

export interface CaretPositionChangedWebviewMessage extends BaseMessage {
  command: 'CARET_POSITION_CHANGED'
  caret_position: number
}

export interface PickModelMessage extends BaseMessage {
  command: 'PICK_MODEL'
  chatbot_name: string
  current_model_id?: string
}

export interface PickChatbotMessage extends BaseMessage {
  command: 'PICK_CHATBOT'
  chatbot_id?: string
}

export interface PickReasoningEffortMessage extends BaseMessage {
  command: 'PICK_REASONING_EFFORT'
  supported_efforts: string[]
  current_effort?: string
}

export interface SaveModeMessage extends BaseMessage {
  command: 'SAVE_MODE'
  mode: Mode
}

export interface GetModeMessage extends BaseMessage {
  command: 'GET_MODE'
}

export interface EditContextMessage extends BaseMessage {
  command: 'EDIT_CONTEXT'
  use_quick_pick: boolean
  api_configuration_id?: string
  invocation_count: number
}

export interface CodeAtCursorMessage extends BaseMessage {
  command: 'CODE_AT_CURSOR'
  use_quick_pick: boolean
  api_configuration_id?: string
  invocation_count: number
}

export interface FindRelevantFilesMessage extends BaseMessage {
  command: 'FIND_RELEVANT_FILES'
  use_quick_pick: boolean
  api_configuration_id?: string
  invocation_count: number
}

export interface ShowAtSignQuickPickMessage extends BaseMessage {
  command: 'SHOW_AT_SIGN_QUICK_PICK'
  is_for_code_completions: boolean
}

export interface ShowHashSignQuickPickMessage extends BaseMessage {
  command: 'SHOW_HASH_SIGN_QUICK_PICK'
  is_for_code_completions: boolean
}

export interface CancelApiRequestMessage extends BaseMessage {
  command: 'CANCEL_API_REQUEST'
}

export interface CancelApiManagerRequestMessage extends BaseMessage {
  command: 'CANCEL_API_MANAGER_REQUEST'
  id: string
}

export interface GetWebPromptTypeMessage extends BaseMessage {
  command: 'GET_WEB_PROMPT_TYPE'
}

export interface SaveWebPromptTypeMessage extends BaseMessage {
  command: 'SAVE_WEB_PROMPT_TYPE'
  prompt_type: WebPromptType
}

export interface GetApiPromptTypeMessage extends BaseMessage {
  command: 'GET_API_PROMPT_TYPE'
}

export interface SaveApiPromptTypeMessage extends BaseMessage {
  command: 'SAVE_API_PROMPT_TYPE'
  prompt_type: ApiPromptType
}

export interface GetApiConfigurationsMessage extends BaseMessage {
  command: 'GET_API_CONFIGURATIONS'
}

export interface ReorderApiConfigurationsMessage extends BaseMessage {
  command: 'REORDER_API_CONFIGURATIONS'
  configurations: ApiConfiguration[]
}

export interface TogglePinnedApiConfigurationMessage extends BaseMessage {
  command: 'TOGGLE_PINNED_API_CONFIGURATION'
  api_configuration_id: string
}

export interface GetVersionMessage extends BaseMessage {
  command: 'GET_VERSION'
}

export interface RequestCurrentlyOpenFileTextMessage extends BaseMessage {
  command: 'REQUEST_CURRENTLY_OPEN_FILE_TEXT'
}

export interface ResponsePreviewMessage extends BaseMessage {
  command: 'RESPONSE_PREVIEW'
  files: (FileInPreview | RelevantFileInPreview)[]
  created_at?: number
}

export interface GetSendWithShiftEnterMessage extends BaseMessage {
  command: 'GET_SEND_WITH_SHIFT_ENTER'
}

export interface ToggleFileInPreviewMessage extends BaseMessage {
  command: 'TOGGLE_FILE_IN_PREVIEW'
  file_path: string
  workspace_name?: string
  is_checked: boolean
}

export interface DiscardUserChangesInPreviewMessage extends BaseMessage {
  command: 'DISCARD_USER_CHANGES_IN_PREVIEW'
  file_path: string
  workspace_name?: string
}

export interface FocusOnFileInPreviewMessage extends BaseMessage {
  command: 'FOCUS_ON_FILE_IN_PREVIEW'
  file_path: string
  workspace_name?: string
}

export interface GoToFileMessage extends BaseMessage {
  command: 'GO_TO_FILE'
  file_path: string
}

export interface OpenFileAndSelectMessage extends BaseMessage {
  command: 'OPEN_FILE_AND_SELECT'
  file_path: string
  start?: string
  end?: string
}

export interface ShowDiffMessage extends BaseMessage {
  command: 'SHOW_DIFF'
  file_path: string
}

export interface GetWorkspaceStateMessage extends BaseMessage {
  command: 'GET_WORKSPACE_STATE'
}

export interface UpdateLastUsedWebConfigurationMessage extends BaseMessage {
  command: 'UPDATE_LAST_USED_WEB_CONFIGURATION'
  web_configuration_name: string
}

export interface IntelligentUpdateFileInPreviewMessage extends BaseMessage {
  command: 'INTELLIGENT_UPDATE_FILE_IN_PREVIEW'
  file_path: string
  workspace_name?: string
  force_model_selection?: boolean
}

export interface CancelIntelligentUpdateFileInPreviewMessage extends BaseMessage {
  command: 'CANCEL_INTELLIGENT_UPDATE_FILE_IN_PREVIEW'
  file_path: string
  workspace_name?: string
}

export interface FixAllFailedFilesMessage extends BaseMessage {
  command: 'FIX_ALL_FAILED_FILES'
  files: { file_path: string; workspace_name?: string }[]
}

export interface ManageApiConfigurationsMessage extends BaseMessage {
  command: 'MANAGE_API_CONFIGURATIONS'
}

export interface UndoMessage extends BaseMessage {
  command: 'UNDO'
}

export interface ApplyResponseFromHistoryMessage extends BaseMessage {
  command: 'APPLY_RESPONSE_FROM_HISTORY'
  response: string
  raw_instructions?: string
  files?: FileInPreview[]
  relevant_files?: RelevantFileInPreview[]
  created_at: number
  url?: string
  recent_api_configuration?: RecentApiConfiguration
}

export interface GetCollapsedStatesMessage extends BaseMessage {
  command: 'GET_COLLAPSED_STATES'
}

export interface SaveComponentCollapsedStateMessage extends BaseMessage {
  command: 'SAVE_COMPONENT_COLLAPSED_STATE'
  component: 'web-configurations' | 'api-configurations'
  is_collapsed: boolean
}

export interface GetCheckpointsMessage extends BaseMessage {
  command: 'GET_CHECKPOINTS'
}

export interface RestoreTempCheckpointMessage extends BaseMessage {
  command: 'RESTORE_TEMP_CHECKPOINT'
}

export interface CreateCheckpointMessage extends BaseMessage {
  command: 'CREATE_CHECKPOINT'
}

export interface ToggleCheckpointStarMessage extends BaseMessage {
  command: 'TOGGLE_CHECKPOINT_STAR'
  timestamp: number
}

export interface RestoreCheckpointMessage extends BaseMessage {
  command: 'RESTORE_CHECKPOINT'
  timestamp: number
}

export interface RemoveResponseHistoryItemMessage extends BaseMessage {
  command: 'REMOVE_RESPONSE_HISTORY_ITEM'
  created_at: number
}

export interface UpdateCheckpointDescriptionMessage extends BaseMessage {
  command: 'UPDATE_CHECKPOINT_DESCRIPTION'
  timestamp: number
  description: string
}

export interface DeleteCheckpointMessage extends BaseMessage {
  command: 'DELETE_CHECKPOINT'
  timestamp: number
}

export interface ClearAllCheckpointsMessage extends BaseMessage {
  command: 'CLEAR_ALL_CHECKPOINTS'
}

export interface RequestCanUndoMessage extends BaseMessage {
  command: 'REQUEST_CAN_UNDO'
}

export interface PreviewSwitchChoiceMessage extends BaseMessage {
  command: 'PREVIEW_SWITCH_CHOICE'
  choice?: 'Switch'
}

export interface GetTasksMessage extends BaseMessage {
  command: 'GET_TASKS'
}

export interface SaveTasksMessage extends BaseMessage {
  command: 'SAVE_TASKS'
  tasks: Record<string, Task[]>
}

export interface DeleteTaskMessage extends BaseMessage {
  command: 'DELETE_TASK'
  root: string
  timestamp: number
}

export interface UpdateFileProgressMessage extends BaseMessage {
  command: 'UPDATE_FILE_PROGRESS'
  file_path: string
  workspace_name?: string
  is_applying: boolean
  apply_status?: 'waiting' | 'thinking' | 'receiving' | 'done'
  apply_progress?: number
  apply_tokens_per_second?: number
}

export interface OpenExternalUrlMessage extends BaseMessage {
  command: 'OPEN_EXTERNAL_URL'
  url: string
}

export interface OpenWebsiteMessage extends BaseMessage {
  command: 'OPEN_WEBSITE'
  url: string
}

export interface UpsertApiConfigurationMessage extends BaseMessage {
  command: 'UPSERT_API_CONFIGURATION'
  tool_type: ToolType
  api_configuration_id?: string
  duplicate_from_id?: string
  create_on_top?: boolean
  insertion_index?: number
}

export interface DeleteApiConfigurationMessage extends BaseMessage {
  command: 'DELETE_API_CONFIGURATION'
  api_configuration_id: string
}

export interface SavePromptImageMessage extends BaseMessage {
  command: 'SAVE_PROMPT_IMAGE'
  content_base64: string
}

export interface OpenPromptImageMessage extends BaseMessage {
  command: 'OPEN_PROMPT_IMAGE'
  hash: string
}

export interface SavePromptPastedTextMessage extends BaseMessage {
  command: 'SAVE_PROMPT_PASTED_TEXT'
  text: string
}

export interface OpenPromptPastedTextMessage extends BaseMessage {
  command: 'OPEN_PROMPT_PASTED_TEXT'
  hash: string
}

export interface PasteUrlMessage extends BaseMessage {
  command: 'PASTE_URL'
  url: string
}

export interface SetRecordingStateMessage extends BaseMessage {
  command: 'SET_RECORDING_STATE'
  is_recording: boolean
}

export interface GetFindRelevantFilesShrinkSourceCodeMessage extends BaseMessage {
  command: 'GET_FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE'
}

export interface SaveFindRelevantFilesShrinkSourceCodeMessage extends BaseMessage {
  command: 'SAVE_FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE'
  shrink_source_code: boolean
}

export interface GetSetupProgressMessage extends BaseMessage {
  command: 'GET_SETUP_PROGRESS'
}

export interface SetupProgressMessage extends BaseMessage {
  command: 'SETUP_PROGRESS'
  setup_progress: SetupProgress
}

export interface RequestReturnHomeMessage extends BaseMessage {
  command: 'REQUEST_RETURN_HOME'
}

export interface GetVoiceInputPushToTalkMessage extends BaseMessage {
  command: 'GET_VOICE_INPUT_PUSH_TO_TALK'
}

export type FrontendMessage =
  | GetInstructionsMessage
  | SaveInstructionsMessage
  | GetEditFormat
  | GetEditFormatInstructionsMessage
  | SaveEditFormatMessage
  | GetConnectionStatusMessage
  | GetWebConfigurationsMessage
  | ReorderWebConfigurationsMessage
  | TogglePinnedWebConfigurationMessage
  | SendToBrowserMessage
  | CopyPromptMessage
  | RequestEditorStateMessage
  | RequestEditorSelectionStateMessage
  | GetHistoryMessage
  | GetResponseHistoryMessage
  | SaveHistoryMessage
  | GetContextSizeWarningThresholdMessage
  | CreateWebConfigurationMessage
  | UpdateWebConfigurationMessage
  | DeleteWebConfigurationMessage
  | DuplicateWebConfigurationMessage
  | ExecuteCommandMessage
  | ShowPromptTemplateQuickPickMessage
  | PreviewWebConfigurationMessage
  | CaretPositionChangedWebviewMessage
  | PickModelMessage
  | PickChatbotMessage
  | PickReasoningEffortMessage
  | SaveModeMessage
  | GetModeMessage
  | EditContextMessage
  | CancelApiRequestMessage
  | CodeAtCursorMessage
  | FindRelevantFilesMessage
  | ShowAtSignQuickPickMessage
  | ShowHashSignQuickPickMessage
  | SaveWebPromptTypeMessage
  | CancelApiManagerRequestMessage
  | GetWebPromptTypeMessage
  | GetApiPromptTypeMessage
  | SaveApiPromptTypeMessage
  | GetApiConfigurationsMessage
  | ReorderApiConfigurationsMessage
  | TogglePinnedApiConfigurationMessage
  | GetVersionMessage
  | RequestCurrentlyOpenFileTextMessage
  | ResponsePreviewMessage
  | GetSendWithShiftEnterMessage
  | ToggleFileInPreviewMessage
  | DiscardUserChangesInPreviewMessage
  | FocusOnFileInPreviewMessage
  | GoToFileMessage
  | ShowDiffMessage
  | OpenFileAndSelectMessage
  | GetWorkspaceStateMessage
  | IntelligentUpdateFileInPreviewMessage
  | CancelIntelligentUpdateFileInPreviewMessage
  | UpdateLastUsedWebConfigurationMessage
  | FixAllFailedFilesMessage
  | ManageApiConfigurationsMessage
  | UndoMessage
  | ApplyResponseFromHistoryMessage
  | GetCollapsedStatesMessage
  | SaveComponentCollapsedStateMessage
  | GetCheckpointsMessage
  | CreateCheckpointMessage
  | ToggleCheckpointStarMessage
  | RestoreCheckpointMessage
  | RestoreTempCheckpointMessage
  | RemoveResponseHistoryItemMessage
  | UpdateCheckpointDescriptionMessage
  | DeleteCheckpointMessage
  | ClearAllCheckpointsMessage
  | RequestCanUndoMessage
  | PreviewSwitchChoiceMessage
  | GetTasksMessage
  | SaveTasksMessage
  | DeleteTaskMessage
  | PreviewGeneratedCodeMessage
  | UpdateFileProgressMessage
  | OpenExternalUrlMessage
  | UpsertApiConfigurationMessage
  | DeleteApiConfigurationMessage
  | SavePromptImageMessage
  | OpenPromptImageMessage
  | SavePromptPastedTextMessage
  | OpenPromptPastedTextMessage
  | PasteUrlMessage
  | OpenWebsiteMessage
  | SetRecordingStateMessage
  | GetFindRelevantFilesShrinkSourceCodeMessage
  | SaveFindRelevantFilesShrinkSourceCodeMessage
  | GetSetupProgressMessage
  | RequestReturnHomeMessage
  | GetVoiceInputPushToTalkMessage

// === FROM BACKEND TO FRONTEND ===
export interface InstructionsMessage extends BaseMessage {
  command: 'INSTRUCTIONS'
  ask_about_context: InstructionsState
  edit_context: InstructionsState
  no_context: InstructionsState
  code_at_cursor: InstructionsState
  find_relevant_files: InstructionsState
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

export interface WebConfigurationsMessage extends BaseMessage {
  command: 'WEB_CONFIGURATIONS'
  web_configurations: WebConfiguration[]
  selected_web_configuration_name_by_mode?: { [T in WebPromptType]?: string }
  selected_api_configuration_id_by_prompt_type?: { [T in ApiPromptType]?: string }
}

export interface ApiConfigurationsMessage extends BaseMessage {
  command: 'API_CONFIGURATIONS'
  configurations: ApiConfiguration[]
}

export interface EditorStateChangedMessage extends BaseMessage {
  command: 'EDITOR_STATE_CHANGED'
  currently_open_file_path?: string
}

export interface EditorSelectionChangedMessage extends BaseMessage {
  command: 'EDITOR_SELECTION_CHANGED'
  current_selection: SelectionState | null
}

export interface ChatHistoryMessage extends BaseMessage {
  command: 'CHAT_HISTORY'
  ask_about_context: string[]
  edit_context: string[]
  no_context: string[]
  code_at_cursor: string[]
  find_relevant_files: string[]
}

export interface ResponseHistoryMessage extends BaseMessage {
  command: 'RESPONSE_HISTORY'
  history: ResponseHistoryItem[]
}

export interface TokenCountMessage extends BaseMessage {
  command: 'TOKEN_COUNT_UPDATED'
  token_count: number
}

export interface ContextSizeWarningThresholdMessage extends BaseMessage {
  command: 'CONTEXT_SIZE_WARNING_THRESHOLD'
  threshold: number
}

export interface WebConfigurationUpdatedMessage extends BaseMessage {
  command: 'WEB_CONFIGURATION_UPDATED'
}

export interface NewlyPickedModelMessage extends BaseMessage {
  command: 'NEWLY_PICKED_MODEL'
  model_id: string
}

export interface NewlyPickedChatbotMessage extends BaseMessage {
  command: 'NEWLY_PICKED_CHATBOT'
  chatbot_id: string
}

export interface NewlyPickedReasoningEffortMessage extends BaseMessage {
  command: 'NEWLY_PICKED_REASONING_EFFORT'
  effort?: string
}

export interface ModeMessage extends BaseMessage {
  command: 'MODE'
  mode: Mode
}

export interface WebPromptTypeMessage extends BaseMessage {
  command: 'WEB_PROMPT_TYPE'
  prompt_type: WebPromptType
}

export interface ApiPromptTypeMessage extends BaseMessage {
  command: 'API_PROMPT_TYPE'
  prompt_type: ApiPromptType
}

export interface VersionMessage extends BaseMessage {
  command: 'VERSION'
  version: string
}

export interface CanUndoChangedMessage extends BaseMessage {
  command: 'CAN_UNDO_CHANGED'
  can_undo: boolean
}

export interface ResetApplyButtonTemporaryDisabledStateMessage extends BaseMessage {
  command: 'RESET_APPLY_BUTTON_TEMPORARY_DISABLED_STATE'
}

export interface ContextFilesMessage extends BaseMessage {
  command: 'CONTEXT_FILES'
  file_paths: string[]
}

export interface SendWithShiftEnterMessage extends BaseMessage {
  command: 'SEND_WITH_SHIFT_ENTER'
  enabled: boolean
}

export interface ResponsePreviewStartedMessage extends BaseMessage {
  command: 'RESPONSE_PREVIEW_STARTED'
  items: ItemInPreview[]
  raw_instructions?: string
  created_at?: number
  auto_run_intelligent_update?: boolean
  url?: string
  recent_api_configuration?: RecentApiConfiguration
}

export interface ResponsePreviewFinishedMessage extends BaseMessage {
  command: 'RESPONSE_PREVIEW_FINISHED'
}

export interface WorkspaceStateMessage extends BaseMessage {
  command: 'WORKSPACE_STATE'
  folder_count: number
}

export interface SelectedWebConfigurationChangedMessage extends BaseMessage {
  command: 'SELECTED_WEB_CONFIGURATION_CHANGED'
  prompt_type: WebPromptType
  name: string
}

export interface SelectedApiConfigurationChangedMessage extends BaseMessage {
  command: 'SELECTED_API_CONFIGURATION_CHANGED'
  prompt_type: ApiPromptType
  id: string
}

export interface FocusPromptFieldMessage extends BaseMessage {
  command: 'FOCUS_PROMPT_FIELD'
}

export interface ShowProgressMessage extends BaseMessage {
  command: 'SHOW_PROGRESS'
  title: string
  progress?: number
  tokens_per_second?: number
  cancellable?: boolean
  show_elapsed_time?: boolean
  delay_visibility?: boolean
}

export interface HideProgressMessage extends BaseMessage {
  command: 'HIDE_PROGRESS'
}

export interface ShowApiManagerProgressMessage extends BaseMessage {
  command: 'SHOW_API_MANAGER_PROGRESS'
  id: string
  title: string
  tokens_per_second?: number
  total_tokens?: number
  cancellable?: boolean
  delay_visibility?: boolean
  provider_name: string
  model?: string
  reasoning_effort?: string
}

export interface HideApiManagerProgressMessage extends BaseMessage {
  command: 'HIDE_API_MANAGER_PROGRESS'
  id: string
}

export interface ShowAutoClosingModalMessage extends BaseMessage {
  command: 'SHOW_AUTO_CLOSING_MODAL'
  title: string
  type: 'success' | 'warning' | 'error' | 'info'
  non_dismissable?: boolean
}

export interface ShowNeverClosingModalMessage extends BaseMessage {
  command: 'SHOW_NEVER_CLOSING_MODAL'
  title: string
  type: 'success' | 'warning' | 'error' | 'info'
}

export interface UpdateFileInPreviewMessage extends BaseMessage {
  command: 'UPDATE_FILE_IN_PREVIEW'
  file: FileInPreview
}

export interface CollapsedStatesMessage extends BaseMessage {
  command: 'COLLAPSED_STATES'
  web_configurations_collapsed: boolean
  api_configurations_collapsed: boolean
}

export interface CheckpointsMessage extends BaseMessage {
  command: 'CHECKPOINTS'
  checkpoints: Checkpoint[]
  has_temp_checkpoint?: boolean
}

export interface CurrentlyOpenFileTextMessage extends BaseMessage {
  command: 'CURRENTLY_OPEN_FILE_TEXT'
  text?: string
}

export interface ShowPreviewOngoingModalMessage extends BaseMessage {
  command: 'SHOW_PREVIEW_ONGOING_MODAL'
}

export interface TasksMessage extends BaseMessage {
  command: 'TASKS'
  tasks: Record<string, Task[]>
}

export interface FindRelevantFilesShrinkSourceCodeMessage extends BaseMessage {
  command: 'FIND_RELEVANT_FILES_SHRINK_SOURCE_CODE'
  shrink_source_code: boolean
}

export interface RecordingStateMessage extends BaseMessage {
  command: 'RECORDING_STATE'
  is_recording: boolean
}

export interface ReturnHomeMessage extends BaseMessage {
  command: 'RETURN_HOME'
}

export interface VoiceInputPushToTalkMessage extends BaseMessage {
  command: 'VOICE_INPUT_PUSH_TO_TALK'
  enabled: boolean
}

export type BackendMessage =
  | InstructionsMessage
  | FocusPromptFieldMessage
  | ConnectionStatusMessage
  | EditFormatMessage
  | EditFormatInstructionsMessage
  | ApiConfigurationsMessage
  | WebConfigurationsMessage
  | EditorStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | ResponseHistoryMessage
  | TokenCountMessage
  | ContextSizeWarningThresholdMessage
  | WebConfigurationUpdatedMessage
  | NewlyPickedModelMessage
  | NewlyPickedChatbotMessage
  | NewlyPickedReasoningEffortMessage
  | ModeMessage
  | WebPromptTypeMessage
  | ApiPromptTypeMessage
  | VersionMessage
  | ContextFilesMessage
  | SendWithShiftEnterMessage
  | CanUndoChangedMessage
  | ResetApplyButtonTemporaryDisabledStateMessage
  | ResponsePreviewStartedMessage
  | ResponsePreviewFinishedMessage
  | WorkspaceStateMessage
  | SelectedWebConfigurationChangedMessage
  | SelectedApiConfigurationChangedMessage
  | ShowProgressMessage
  | HideProgressMessage
  | ShowApiManagerProgressMessage
  | HideApiManagerProgressMessage
  | ShowAutoClosingModalMessage
  | ShowNeverClosingModalMessage
  | UpdateFileInPreviewMessage
  | CollapsedStatesMessage
  | CheckpointsMessage
  | CurrentlyOpenFileTextMessage
  | ShowPreviewOngoingModalMessage
  | TasksMessage
  | UpdateFileProgressMessage
  | RecordingStateMessage
  | FindRelevantFilesShrinkSourceCodeMessage
  | SetupProgressMessage
  | ReturnHomeMessage
  | VoiceInputPushToTalkMessage
