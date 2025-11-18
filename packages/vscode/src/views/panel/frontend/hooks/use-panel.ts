import { useEffect, useState } from 'react'
import { Preset } from '@shared/types/preset'
import {
  BackendMessage,
  FileProgress,
  FrontendMessage
} from '../../types/messages'
import { MainViewType } from '../../types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { post_message } from '../utils/post_message'
import { ItemInPreview } from '@shared/types/file-in-preview'
import { ResponseHistoryItem } from '@shared/types/response-history-item'

export const use_panel = (vscode: any) => {
  const [active_view, set_active_view] = useState<'home' | 'main'>('home')
  const [main_view_scroll_reset_key, set_main_view_scroll_reset_key] =
    useState(0)
  const [version, set_version] = useState<string>('')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [items_to_review, set_items_to_review] = useState<ItemInPreview[]>()
  const [raw_instructions, set_raw_instructions] = useState<string>()
  const [progress_state, set_progress_state] = useState<{
    title: string
    progress?: number
    tokens_per_second?: number
    files?: FileProgress[]
  }>()
  const [chat_initialized_title, set_chat_initialized_title] = useState<
    string | undefined
  >()
  const [commit_message_to_review, set_commit_message_to_review] = useState<
    | {
        commit_message: string
        auto_accept_after_seconds: number
      }
    | undefined
  >()
  const [files_to_stage, set_files_to_stage] = useState<string[]>()
  const [
    commit_button_enabling_trigger_count,
    set_commit_button_enabling_trigger_count
  ] = useState(0)
  const [
    selected_history_item_created_at,
    set_selected_history_item_created_at
  ] = useState<number>()
  const [response_history, set_response_history] = useState<
    ResponseHistoryItem[]
  >([])
  const [workspace_folder_count, set_workspace_folder_count] =
    useState<number>()
  const [is_connected, set_is_connected] = useState<boolean>()
  const [updated_preset, set_updated_preset] = useState<Preset>()
  const [ask_instructions, set_ask_instructions] = useState<
    string | undefined
  >()
  const [edit_instructions, set_edit_instructions] = useState<
    string | undefined
  >()
  const [no_context_instructions, set_no_context_instructions] = useState<
    string | undefined
  >()
  const [has_active_editor, set_has_active_editor] = useState<
    boolean | undefined
  >()
  const [has_active_selection, set_has_active_selection] = useState<
    boolean | undefined
  >()
  const [code_completions_instructions, set_code_completions_instructions] =
    useState<string | undefined>(undefined)
  const [main_view_type, set_main_view_type] = useState<MainViewType>()
  const [web_mode, set_web_mode] = useState<WebMode>()
  const [api_mode, set_api_mode] = useState<ApiMode>()
  const [chat_input_focus_key, set_chat_input_focus_key] = useState(0)
  const [chat_input_focus_and_select_key, set_chat_input_focus_and_select_key] =
    useState(0)
  const [context_size_warning_threshold, set_context_size_warning_threshold] =
    useState<number>()
  const [has_changes_to_commit, set_has_changes_to_commit] =
    useState<boolean>(false)
  const [can_undo, set_can_undo] = useState<boolean>(false)
  const [context_file_paths, set_context_file_paths] = useState<string[]>([])
  const [presets_collapsed_by_web_mode, set_presets_collapsed_by_web_mode] =
    useState<{ [mode in WebMode]?: boolean }>({})
  const [
    configurations_collapsed_by_api_mode,
    set_configurations_collapsed_by_api_mode
  ] = useState<{ [mode in ApiMode]?: boolean }>({})

  const handle_instructions_change = (
    value: string,
    mode: 'ask' | 'edit-context' | 'no-context' | 'code-completions'
  ) => {
    if (mode == 'ask') set_ask_instructions(value)
    else if (mode == 'edit-context') set_edit_instructions(value)
    else if (mode == 'no-context') set_no_context_instructions(value)
    else if (mode == 'code-completions')
      set_code_completions_instructions(value)

    post_message(vscode, {
      command: 'SAVE_INSTRUCTIONS',
      instruction: value,
      mode: mode
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'PRESET_UPDATED') {
        set_updating_preset(undefined)
        set_updated_preset(undefined)
      } else if (message.command == 'INSTRUCTIONS') {
        set_ask_instructions(message.ask)
        set_edit_instructions(message.edit_context)
        set_no_context_instructions(message.no_context)
        set_code_completions_instructions(message.code_completions)
      } else if (message.command == 'CONNECTION_STATUS') {
        set_is_connected(message.connected)
      } else if (message.command == 'VERSION') {
        set_version(message.version)
      } else if (message.command == 'MAIN_VIEW_TYPE') {
        set_main_view_type(message.view_type)
      } else if (message.command == 'WEB_MODE') {
        set_web_mode(message.mode)
      } else if (message.command == 'API_MODE') {
        set_api_mode(message.mode)
      } else if (message.command == 'COLLAPSED_STATES') {
        set_presets_collapsed_by_web_mode(message.presets_collapsed_by_web_mode)
        set_configurations_collapsed_by_api_mode(
          message.configurations_collapsed_by_api_mode
        )
      } else if (message.command == 'EDITOR_STATE_CHANGED') {
        set_has_active_editor(message.has_active_editor)
      } else if (message.command == 'EDITOR_SELECTION_CHANGED') {
        set_has_active_selection(message.has_selection)
      } else if (message.command == 'CONTEXT_FILES') {
        set_context_file_paths(message.file_paths)
      } else if (message.command == 'RESPONSE_PREVIEW_STARTED') {
        set_items_to_review(message.items)
        set_raw_instructions(message.raw_instructions)
      } else if (message.command == 'UPDATE_FILE_IN_REVIEW') {
        set_items_to_review((current_items) => {
          const items = current_items ?? []
          const existing_file_index = items.findIndex(
            (f) =>
              f.type === 'file' &&
              f.file_path == message.file.file_path &&
              f.workspace_name == message.file.workspace_name
          )

          if (existing_file_index != -1) {
            const new_items = [...items]
            const existing_item = items[existing_file_index]
            if (existing_item.type === 'file') {
              new_items[existing_file_index] = {
                ...message.file,
                is_checked: existing_item.is_checked
              }
            }
            return new_items
          } else {
            return [...items, { ...message.file, is_checked: true }]
          }
        })
      } else if (message.command == 'RESPONSE_PREVIEW_FINISHED') {
        set_items_to_review(undefined)
        set_raw_instructions(undefined)
      } else if (message.command == 'WORKSPACE_STATE') {
        set_workspace_folder_count(message.folder_count)
      } else if (message.command == 'SHOW_PROGRESS') {
        set_progress_state({
          title: message.title,
          progress: message.progress,
          tokens_per_second: message.tokens_per_second,
          files: message.files
        })
      } else if (message.command == 'HIDE_PROGRESS') {
        set_progress_state(undefined)
      } else if (message.command == 'SHOW_CHAT_INITIALIZED') {
        set_chat_initialized_title(message.title)
      } else if (message.command == 'FOCUS_PROMPT_FIELD') {
        set_chat_input_focus_key((k) => k + 1)
      } else if (message.command == 'SHOW_COMMIT_MESSAGE_MODAL') {
        set_commit_message_to_review({
          commit_message: message.commit_message,
          auto_accept_after_seconds: message.auto_accept_after_seconds
        })
      } else if (message.command == 'SHOW_STAGE_FILES_MODAL') {
        set_files_to_stage(message.files)
      } else if (message.command == 'COMMIT_PROCESS_CANCELLED') {
        set_commit_button_enabling_trigger_count((k) => k + 1)
      } else if (message.command == 'RESPONSE_HISTORY') {
        set_response_history(message.history)
      } else if (message.command == 'CONTEXT_SIZE_WARNING_THRESHOLD') {
        set_context_size_warning_threshold(message.threshold)
      } else if (message.command == 'GIT_STATE_CHANGED') {
        set_has_changes_to_commit(message.has_changes_to_commit)
      } else if (message.command == 'CAN_UNDO_CHANGED') {
        set_can_undo(message.can_undo)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_RESPONSE_HISTORY' },
      { command: 'GET_VERSION' },
      { command: 'GET_MAIN_VIEW_TYPE' },
      { command: 'GET_WEB_MODE' },
      { command: 'GET_API_MODE' },
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_WORKSPACE_STATE' },
      { command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD' },
      { command: 'REQUEST_GIT_STATE' },
      { command: 'GET_COLLAPSED_STATES' }
    ]
    initial_messages.forEach((message) => post_message(vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_preset_back_click_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset!,
      updated_preset: updated_preset!,
      origin: 'back_button'
    })
  }

  const edit_preset_save_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset!,
      updated_preset: updated_preset!,
      origin: 'save_button'
    })
  }

  const handle_preview_preset = () => {
    post_message(vscode, {
      command: 'PREVIEW_PRESET',
      preset: updated_preset!
    })
  }

  const handle_web_mode_change = (new_mode: WebMode) => {
    set_web_mode(new_mode)
    set_chat_input_focus_and_select_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_WEB_MODE',
      mode: new_mode
    })
    post_message(vscode, {
      command: 'GET_CURRENT_TOKEN_COUNT'
    })
  }

  const handle_api_mode_change = (new_mode: ApiMode) => {
    set_api_mode(new_mode)
    set_chat_input_focus_and_select_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_API_MODE',
      mode: new_mode
    })
    post_message(vscode, {
      command: 'GET_CURRENT_TOKEN_COUNT'
    })
  }

  const handle_main_view_type_change = (view_type: MainViewType) => {
    set_main_view_type(view_type)
    set_chat_input_focus_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_MAIN_VIEW_TYPE',
      view_type
    })
  }

  const handle_presets_collapsed_change = (is_collapsed: boolean) => {
    if (!web_mode) return
    set_presets_collapsed_by_web_mode((prev) => ({
      ...prev,
      [web_mode]: is_collapsed
    }))
    post_message(vscode, {
      command: 'SAVE_COMPONENT_COLLAPSED_STATE',
      component: 'presets',
      is_collapsed,
      mode: web_mode
    })
  }

  const handle_configurations_collapsed_change = (is_collapsed: boolean) => {
    if (!api_mode) return
    set_configurations_collapsed_by_api_mode((prev) => ({
      ...prev,
      [api_mode]: is_collapsed
    }))
    post_message(vscode, {
      command: 'SAVE_COMPONENT_COLLAPSED_STATE',
      component: 'configurations',
      is_collapsed,
      mode: api_mode
    })
  }

  return {
    active_view,
    set_active_view,
    main_view_scroll_reset_key,
    set_main_view_scroll_reset_key,
    version,
    updating_preset,
    set_updating_preset,
    items_to_review,
    set_items_to_review,
    raw_instructions,
    progress_state,
    set_progress_state,
    chat_initialized_title,
    set_chat_initialized_title,
    commit_message_to_review,
    set_commit_message_to_review,
    files_to_stage,
    set_files_to_stage,
    commit_button_enabling_trigger_count,
    set_commit_button_enabling_trigger_count,
    selected_history_item_created_at,
    set_selected_history_item_created_at,
    response_history,
    set_response_history,
    workspace_folder_count,
    is_connected,
    updated_preset,
    set_updated_preset,
    ask_instructions,
    edit_instructions,
    no_context_instructions,
    has_active_editor,
    has_active_selection,
    code_completions_instructions,
    main_view_type,
    web_mode,
    api_mode,
    chat_input_focus_key,
    chat_input_focus_and_select_key,
    set_chat_input_focus_and_select_key,
    context_size_warning_threshold,
    has_changes_to_commit,
    can_undo,
    context_file_paths,
    presets_collapsed: web_mode
      ? presets_collapsed_by_web_mode[web_mode] ?? false
      : false,
    configurations_collapsed: api_mode
      ? configurations_collapsed_by_api_mode[api_mode] ?? false
      : false,
    handle_instructions_change,
    edit_preset_back_click_handler,
    edit_preset_save_handler,
    handle_preview_preset,
    handle_web_mode_change,
    handle_api_mode_change,
    handle_main_view_type_change,
    handle_presets_collapsed_change,
    handle_configurations_collapsed_change
  }
}
