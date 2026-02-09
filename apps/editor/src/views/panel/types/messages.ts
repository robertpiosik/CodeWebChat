import { EditFormat } from '@shared/types/edit-format'
import { FileInPreview, ItemInPreview } from '@shared/types/file-in-preview'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { Preset } from '@shared/types/preset'
import { Task } from '@shared/types/task'
import { Mode } from './main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { ToolType } from '@/views/settings/types/tools'

export interface BaseMessage {
  command: string
}

export type SetupProgress = {
  has_model_provider: boolean
  has_configuration_for_edit_context: boolean
  has_configuration_for_intelligent_update: boolean
  has_configuration_for_prune_context: boolean
  has_configuration_for_code_at_cursor: boolean
  has_configuration_for_voice_input: boolean
  has_configuration_for_commit_messages: boolean
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

export type ApiToolConfiguration = {
  id: string
  provider_type: string
  provider_name: string
  model: string
  temperature?: number
  reasoning_effort?: string
  is_default?: boolean
  is_pinned?: boolean
}

export type Checkpoint = {
  timestamp: number
  title: string
  description?: string
  is_starred?: boolean
}

export type FileProgressStatus =
  | 'waiting'
  | 'thinking'
  | 'receiving'
  | 'retrying'

// === FROM FRONTEND TO BACKEND ===
export interface GetInstructionsMessage extends BaseMessage {
  command: 'GET_INSTRUCTIONS'
}

export interface SaveInstructionsMessage extends BaseMessage {
  command: 'SAVE_INSTRUCTIONS'
  instruction: string
  prompt_type:
    | 'ask-about-context'
    | 'edit-context'
    | 'code-at-cursor'
    | 'prune-context'
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

export interface GetPresetsMessage extends BaseMessage {
  command: 'GET_PRESETS'
}

export interface ReplacePresetsMessage extends BaseMessage {
  command: 'REPLACE_PRESETS'
  presets: Preset[]
}

export interface SendToBrowserMessage extends BaseMessage {
  command: 'SEND_TO_BROWSER'
  invocation_count: number
  preset_name?: string
  group_name?: string
  show_quick_pick?: boolean
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
    | 'prune-context'
    | 'no-context'
}

export interface GetContextSizeWarningThresholdMessage extends BaseMessage {
  command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD'
}

export interface UpdatePresetMessage extends BaseMessage {
  command: 'UPDATE_PRESET'
  updating_preset: Preset
  updated_preset: Preset
  origin: 'back_button' | 'save_button'
}

export interface DeletePresetGroupOrSeparatorMessage extends BaseMessage {
  command: 'DELETE_PRESET_GROUP_OR_SEPARATOR'
  index: number
}

export interface DuplicatePresetGroupOrSeparatorMessage extends BaseMessage {
  command: 'DUPLICATE_PRESET_GROUP_OR_SEPARATOR'
  index: number
}

export interface CreatePresetGroupOrSeparatorMessage extends BaseMessage {
  command: 'CREATE_PRESET_GROUP_OR_SEPARATOR'
  placement?: 'top' | 'bottom'
  reference_index?: number
}

export interface ExecuteCommandMessage extends BaseMessage {
  command: 'EXECUTE_COMMAND'
  command_id: string
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

export interface PickModelMessage extends BaseMessage {
  command: 'PICK_MODEL'
  chatbot_name: string
}

export interface PickChatbotMessage extends BaseMessage {
  command: 'PICK_CHATBOT'
  chatbot_id?: string
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
  config_id?: string
  invocation_count: number
}

export interface CodeCompletionMessage extends BaseMessage {
  command: 'CODE_COMPLETION'
  use_quick_pick: boolean
  config_id?: string
  invocation_count: number
}

export interface PruneContextMessage extends BaseMessage {
  command: 'PRUNE_CONTEXT'
  use_quick_pick: boolean
  config_id?: string
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

export interface GetApiToolConfigurationsMessage extends BaseMessage {
  command: 'GET_API_TOOL_CONFIGURATIONS'
}

export interface ReorderApiToolConfigurationsMessage extends BaseMessage {
  command: 'REORDER_API_TOOL_CONFIGURATIONS'
  prompt_type: ApiPromptType
  configurations: ApiToolConfiguration[]
}

export interface TogglePinnedApiToolConfigurationMessage extends BaseMessage {
  command: 'TOGGLE_PINNED_API_TOOL_CONFIGURATION'
  prompt_type: ApiPromptType
  configuration_id: string
}

export interface GetVersionMessage extends BaseMessage {
  command: 'GET_VERSION'
}

export interface RequestCurrentlyOpenFileTextMessage extends BaseMessage {
  command: 'REQUEST_CURRENTLY_OPEN_FILE_TEXT'
}

export interface ResponsePreviewMessage extends BaseMessage {
  command: 'RESPONSE_PREVIEW'
  files: FileInPreview[]
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

export interface UpdateLastUsedPresetMessage extends BaseMessage {
  command: 'UPDATE_LAST_USED_PRESET'
  preset_name: string
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

export interface ManageConfigurationsMessage extends BaseMessage {
  command: 'MANAGE_CONFIGURATIONS'
  api_prompt_type: ApiPromptType
}

export interface UndoMessage extends BaseMessage {
  command: 'UNDO'
}

export interface ApplyResponseFromHistoryMessage extends BaseMessage {
  command: 'APPLY_RESPONSE_FROM_HISTORY'
  response: string
  raw_instructions?: string
  files?: FileInPreview[]
  created_at: number
}

export interface GetCollapsedStatesMessage extends BaseMessage {
  command: 'GET_COLLAPSED_STATES'
}

export interface SaveComponentCollapsedStateMessage extends BaseMessage {
  command: 'SAVE_COMPONENT_COLLAPSED_STATE'
  component: 'presets' | 'configurations' | 'timeline' | 'tasks'
  is_collapsed: boolean
  prompt_type?: WebPromptType | ApiPromptType
}

export interface GetCheckpointsMessage extends BaseMessage {
  command: 'GET_CHECKPOINTS'
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
  apply_status?: 'waiting' | 'thinking' | 'receiving' | 'done' | 'retrying'
  apply_progress?: number
  apply_tokens_per_second?: number
}

export interface GetPruneContextInstructionsPrefixMessage extends BaseMessage {
  command: 'GET_PRUNE_CONTEXT_INSTRUCTIONS_PREFIX'
}

export interface SavePruneContextInstructionsPrefixMessage extends BaseMessage {
  command: 'SAVE_PRUNE_CONTEXT_INSTRUCTIONS_PREFIX'
  prefix: string
}

export interface OpenExternalUrlMessage extends BaseMessage {
  command: 'OPEN_EXTERNAL_URL'
  url: string
}

export interface UpsertConfigurationMessage extends BaseMessage {
  command: 'UPSERT_CONFIGURATION'
  tool_type: ToolType
  configuration_id?: string
  create_on_top?: boolean
  insertion_index?: number
}

export interface DeleteConfigurationMessage extends BaseMessage {
  command: 'DELETE_CONFIGURATION'
  api_prompt_type: ApiPromptType
  configuration_id: string
}

export interface SavePromptImageMessage extends BaseMessage {
  command: 'SAVE_PROMPT_IMAGE'
  content_base64: string
}

export interface OpenPromptImageMessage extends BaseMessage {
  command: 'OPEN_PROMPT_IMAGE'
  hash: string
}

export interface SavePromptDocumentMessage extends BaseMessage {
  command: 'SAVE_PROMPT_DOCUMENT'
  text: string
}

export interface OpenPromptDocumentMessage extends BaseMessage {
  command: 'OPEN_PROMPT_DOCUMENT'
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

export interface GetSetupProgressMessage extends BaseMessage {
  command: 'GET_SETUP_PROGRESS'
}

export interface SetupProgressMessage {
  command: 'SETUP_PROGRESS'
  setup_progress: SetupProgress
}

export type FrontendMessage =
  | GetInstructionsMessage
  | SaveInstructionsMessage
  | GetEditFormat
  | GetEditFormatInstructionsMessage
  | SaveEditFormatMessage
  | GetConnectionStatusMessage
  | GetPresetsMessage
  | ReplacePresetsMessage
  | SendToBrowserMessage
  | CopyPromptMessage
  | RequestEditorStateMessage
  | RequestEditorSelectionStateMessage
  | GetHistoryMessage
  | GetResponseHistoryMessage
  | SaveHistoryMessage
  | GetContextSizeWarningThresholdMessage
  | UpdatePresetMessage
  | DeletePresetGroupOrSeparatorMessage
  | DuplicatePresetGroupOrSeparatorMessage
  | CreatePresetGroupOrSeparatorMessage
  | ExecuteCommandMessage
  | ShowPromptTemplateQuickPickMessage
  | PreviewPresetMessage
  | CaretPositionChangedWebviewMessage
  | PickModelMessage
  | PickChatbotMessage
  | SaveModeMessage
  | GetModeMessage
  | EditContextMessage
  | CancelApiRequestMessage
  | CodeCompletionMessage
  | PruneContextMessage
  | ShowAtSignQuickPickMessage
  | ShowHashSignQuickPickMessage
  | SaveWebPromptTypeMessage
  | CancelApiManagerRequestMessage
  | GetWebPromptTypeMessage
  | GetApiPromptTypeMessage
  | SaveApiPromptTypeMessage
  | GetApiToolConfigurationsMessage
  | ReorderApiToolConfigurationsMessage
  | TogglePinnedApiToolConfigurationMessage
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
  | UpdateLastUsedPresetMessage
  | FixAllFailedFilesMessage
  | ManageConfigurationsMessage
  | UndoMessage
  | ApplyResponseFromHistoryMessage
  | GetCollapsedStatesMessage
  | SaveComponentCollapsedStateMessage
  | GetCheckpointsMessage
  | CreateCheckpointMessage
  | ToggleCheckpointStarMessage
  | RestoreCheckpointMessage
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
  | GetPruneContextInstructionsPrefixMessage
  | SavePruneContextInstructionsPrefixMessage
  | OpenExternalUrlMessage
  | UpsertConfigurationMessage
  | DeleteConfigurationMessage
  | SavePromptImageMessage
  | OpenPromptImageMessage
  | SavePromptDocumentMessage
  | OpenPromptDocumentMessage
  | PasteUrlMessage
  | SetRecordingStateMessage
  | GetSetupProgressMessage

// === FROM BACKEND TO FRONTEND ===
export interface InstructionsMessage extends BaseMessage {
  command: 'INSTRUCTIONS'
  ask_about_context: string
  edit_context: string
  no_context: string
  code_at_cursor: string
  prune_context: string
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
  presets: { [T in WebPromptType]: Preset[] }
  selected_preset_or_group_name_by_mode?: { [T in WebPromptType]?: string }
  selected_configuration_id_by_prompt_type?: { [T in ApiPromptType]?: string }
}

export interface ApiToolConfigurationsMessage extends BaseMessage {
  command: 'API_TOOL_CONFIGURATIONS'
  configurations: { [T in ApiPromptType]?: ApiToolConfiguration[] }
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
  prune_context: string[]
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

export interface PresetCreatedMessage extends BaseMessage {
  command: 'PRESET_CREATED'
  preset: Preset
}

export interface PresetUpdatedMessage extends BaseMessage {
  command: 'PRESET_UPDATED'
}

export interface NewlyPickedModelMessage extends BaseMessage {
  command: 'NEWLY_PICKED_MODEL'
  model_id: string
}

export interface NewlyPickedChatbotMessage extends BaseMessage {
  command: 'NEWLY_PICKED_CHATBOT'
  chatbot_id: string
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
  fix_all_automatically?: boolean
}

export interface ResponsePreviewFinishedMessage extends BaseMessage {
  command: 'RESPONSE_PREVIEW_FINISHED'
}

export interface WorkspaceStateMessage extends BaseMessage {
  command: 'WORKSPACE_STATE'
  folder_count: number
}

export interface SelectedPresetOrGroupChangedMessage extends BaseMessage {
  command: 'SELECTED_PRESET_OR_GROUP_CHANGED'
  prompt_type: WebPromptType
  name?: string
}

export interface SelectedConfigurationChangedMessage extends BaseMessage {
  command: 'SELECTED_CONFIGURATION_CHANGED'
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
  show_elapsed_time?: boolean
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
}

export interface UpdateFileInPreviewMessage extends BaseMessage {
  command: 'UPDATE_FILE_IN_PREVIEW'
  file: FileInPreview
}

export interface CollapsedStatesMessage extends BaseMessage {
  command: 'COLLAPSED_STATES'
  presets_collapsed_by_web_mode: { [mode in WebPromptType]?: boolean }
  configurations_collapsed_by_api_mode: { [mode in ApiPromptType]?: boolean }
  are_tasks_collapsed: boolean
  is_timeline_collapsed: boolean
}

export interface CheckpointsMessage extends BaseMessage {
  command: 'CHECKPOINTS'
  checkpoints: Checkpoint[]
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

export interface PruneContextInstructionsPrefixMessage extends BaseMessage {
  command: 'PRUNE_CONTEXT_INSTRUCTIONS_PREFIX'
  prefix: string
}

export interface SetupProgressMessage {
  command: 'SETUP_PROGRESS'
  setup_progress: SetupProgress
}

export interface RecordingStateMessage extends BaseMessage {
  command: 'RECORDING_STATE'
  is_recording: boolean
}

export type BackendMessage =
  | InstructionsMessage
  | FocusPromptFieldMessage
  | ConnectionStatusMessage
  | EditFormatMessage
  | EditFormatInstructionsMessage
  | ApiToolConfigurationsMessage
  | PresetsMessage
  | EditorStateChangedMessage
  | EditorSelectionChangedMessage
  | ChatHistoryMessage
  | ResponseHistoryMessage
  | TokenCountMessage
  | ContextSizeWarningThresholdMessage
  | PresetCreatedMessage
  | PresetUpdatedMessage
  | NewlyPickedModelMessage
  | NewlyPickedChatbotMessage
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
  | SelectedPresetOrGroupChangedMessage
  | SelectedConfigurationChangedMessage
  | ShowProgressMessage
  | HideProgressMessage
  | ShowApiManagerProgressMessage
  | HideApiManagerProgressMessage
  | ShowAutoClosingModalMessage
  | UpdateFileInPreviewMessage
  | CollapsedStatesMessage
  | CheckpointsMessage
  | CurrentlyOpenFileTextMessage
  | ShowPreviewOngoingModalMessage
  | TasksMessage
  | UpdateFileProgressMessage
  | PruneContextInstructionsPrefixMessage
  | RecordingStateMessage
  | SetupProgressMessage
