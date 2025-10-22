import { Main } from './Main'
import { useEffect, useState } from 'react'
import { Page as UiPage } from '@ui/components/editor/panel/Page'
import { EditPresetForm } from '@/views/panel/frontend/EditPresetForm'
import { Preset } from '@shared/types/preset'
import {
  BackendMessage,
  FileProgress,
  FrontendMessage
} from '../types/messages'
import { TextButton as UiTextButton } from '@ui/components/editor/panel/TextButton'
import { HOME_VIEW_TYPES, HomeViewType } from '../types/home-view-type'
import { Home } from './Home'
import styles from './Panel.module.scss'
import cn from 'classnames'
import { ApiMode, WebMode } from '@shared/types/modes'
import { post_message } from './utils/post_message'
import { FileInReview } from '@shared/types/file-in-review'
import { ResponseReview as UiResponseReview } from '@ui/components/editor/panel/ResponseReview'
import { ProgressModal as UiProgressModal } from '@ui/components/editor/panel/modals/ProgressModal'
import { ChatInitializedModal as UiChatInitializedModal } from '@ui/components/editor/panel/modals/ChatInitializedModal'
import { CommitMessageModal as UiCommitMessageModal } from '@ui/components/editor/panel/modals/CommitMessageModal'

const vscode = acquireVsCodeApi()

type CheckedFileInReview = FileInReview & { is_checked: boolean }
type ResponseHistoryItem = {
  response: string
  raw_instructions?: string
  created_at: number
  lines_added: number
  lines_removed: number
}

export const Panel = () => {
  const [active_view, set_active_view] = useState<'home' | 'main'>('home')
  const [main_view_scroll_reset_key, set_main_view_scroll_reset_key] =
    useState(0)
  const [version, set_version] = useState<string>('')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [files_to_review, set_files_to_review] =
    useState<CheckedFileInReview[]>()
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
    string | undefined
  >()
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
  const [are_donations_visible, set_are_donations_visible] = useState<
    boolean | undefined
  >()
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
  const [home_view_type, set_home_view_type] = useState<HomeViewType>()
  const [web_mode, set_web_mode] = useState<WebMode>()
  const [api_mode, set_api_mode] = useState<ApiMode>()
  const [chat_input_focus_key, set_chat_input_focus_key] = useState(0)
  const [chat_input_focus_and_select_key, set_chat_input_focus_and_select_key] =
    useState(0)
  const [context_size_warning_threshold, set_context_size_warning_threshold] =
    useState<number>()

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
      } else if (message.command == 'DONATIONS_VISIBILITY') {
        set_are_donations_visible(message.is_visible)
      } else if (message.command == 'HOME_VIEW_TYPE') {
        set_home_view_type(message.view_type)
      } else if (message.command == 'WEB_MODE') {
        set_web_mode(message.mode)
      } else if (message.command == 'API_MODE') {
        set_api_mode(message.mode)
      } else if (message.command == 'EDITOR_STATE_CHANGED') {
        set_has_active_editor(message.has_active_editor)
      } else if (message.command == 'EDITOR_SELECTION_CHANGED') {
        set_has_active_selection(message.has_selection)
      } else if (message.command == 'CODE_REVIEW_STARTED') {
        set_files_to_review(
          message.files.map((f) => ({ ...f, is_checked: true }))
        )
        set_raw_instructions(message.raw_instructions)
      } else if (message.command == 'UPDATE_FILE_IN_REVIEW') {
        set_files_to_review((current_files) =>
          current_files?.map((f) =>
            f.file_path == message.file.file_path &&
            f.workspace_name == message.file.workspace_name
              ? { ...message.file, is_checked: f.is_checked }
              : f
          )
        )
      } else if (message.command == 'CODE_REVIEW_FINISHED') {
        set_files_to_review(undefined)
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
      } else if (message.command == 'FOCUS_CHAT_INPUT') {
        set_chat_input_focus_key((k) => k + 1)
      } else if (message.command == 'SHOW_COMMIT_MESSAGE_MODAL') {
        set_commit_message_to_review(message.commit_message)
      } else if (message.command == 'COMMIT_PROCESS_CANCELLED') {
        set_commit_button_enabling_trigger_count((k) => k + 1)
      } else if (message.command == 'NEW_RESPONSE_RECEIVED') {
        const now = Date.now()
        if (!response_history.length) {
          set_selected_history_item_created_at(now)
          set_response_history([
            {
              response: message.response,
              raw_instructions: message.raw_instructions,
              created_at: now,
              lines_added: message.lines_added,
              lines_removed: message.lines_removed
            }
          ])
        } else {
          const is_duplicate = response_history.some(
            (item) =>
              item.response == message.response &&
              item.raw_instructions == message.raw_instructions
          )
          if (!is_duplicate) {
            const new_item = {
              response: message.response,
              raw_instructions: message.raw_instructions,
              created_at: now,
              lines_added: message.lines_added,
              lines_removed: message.lines_removed
            }
            set_response_history([...response_history, new_item])
            if (!files_to_review) {
              set_selected_history_item_created_at(now)
            }
          } else {
            set_selected_history_item_created_at(
              response_history.find(
                (item) =>
                  item.response == message.response &&
                  item.raw_instructions == message.raw_instructions
              )?.created_at
            )
          }
        }
      } else if (message.command == 'CONTEXT_SIZE_WARNING_THRESHOLD') {
        set_context_size_warning_threshold(message.threshold)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_VERSION' },
      { command: 'GET_DONATIONS_VISIBILITY' },
      { command: 'GET_HOME_VIEW_TYPE' },
      { command: 'GET_WEB_MODE' },
      { command: 'GET_API_MODE' },
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_WORKSPACE_STATE' },
      { command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD' }
    ]
    initial_messages.forEach((message) => post_message(vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [response_history, files_to_review])

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

  const handle_home_view_type_change = (view_type: HomeViewType) => {
    set_home_view_type(view_type)
    set_chat_input_focus_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_HOME_VIEW_TYPE',
      view_type
    })
  }

  const handle_donations_visibility_change = () => {
    const is_visible = !are_donations_visible
    set_are_donations_visible(is_visible)
    post_message(vscode, {
      command: 'SAVE_DONATIONS_VISIBILITY',
      is_visible
    })
  }

  if (
    ask_instructions === undefined ||
    edit_instructions === undefined ||
    no_context_instructions === undefined ||
    !version ||
    are_donations_visible === undefined ||
    code_completions_instructions === undefined ||
    home_view_type === undefined ||
    web_mode === undefined ||
    is_connected === undefined ||
    api_mode === undefined ||
    has_active_editor === undefined ||
    has_active_selection === undefined ||
    workspace_folder_count === undefined ||
    context_size_warning_threshold === undefined
  ) {
    return null
  }

  if (workspace_folder_count == 0) {
    return (
      <div
        style={{
          padding: '4px 12px 4px 18px'
        }}
      >
        You have not yet opened a folder.
      </div>
    )
  }

  const is_for_code_completions =
    (home_view_type == HOME_VIEW_TYPES.WEB && web_mode == 'code-completions') ||
    (home_view_type == HOME_VIEW_TYPES.API && api_mode == 'code-completions')

  const get_current_instructions = () => {
    if (is_for_code_completions) {
      return code_completions_instructions
    }
    const mode = home_view_type == HOME_VIEW_TYPES.WEB ? web_mode : api_mode
    if (mode == 'ask') return ask_instructions
    if (mode == 'edit-context') return edit_instructions
    if (mode == 'no-context') return no_context_instructions
    return ''
  }

  const has_affixes =
    !!updated_preset?.prompt_prefix || !!updated_preset?.prompt_suffix
  const has_instructions = !!get_current_instructions().trim()
  const is_preview_disabled =
    !is_connected ||
    (!has_affixes && !has_instructions && web_mode != 'code-completions') ||
    (web_mode == 'code-completions' &&
      (!has_active_editor || has_active_selection))

  return (
    <div className={styles.container}>
      <div
        className={cn(styles.slot, {
          [styles['slot--hidden']]: active_view != 'main'
        })}
      >
        <Main
          scroll_reset_key={main_view_scroll_reset_key}
          vscode={vscode}
          on_preset_edit={(preset) => {
            post_message(vscode, {
              command: 'UPDATE_LAST_USED_PRESET',
              preset_name: preset.name
            })
            set_updating_preset(preset)
            set_updated_preset(preset)
          }}
          is_connected={is_connected}
          on_show_home={() => {
            set_active_view('home')
          }}
          ask_instructions={ask_instructions}
          edit_instructions={edit_instructions}
          no_context_instructions={no_context_instructions}
          code_completions_instructions={code_completions_instructions}
          set_instructions={handle_instructions_change}
          home_view_type={home_view_type}
          web_mode={web_mode}
          api_mode={api_mode}
          on_home_view_type_change={handle_home_view_type_change}
          has_active_editor={has_active_editor}
          has_active_selection={has_active_selection}
          on_web_mode_change={handle_web_mode_change}
          on_api_mode_change={handle_api_mode_change}
          response_history={response_history}
          selected_history_item_created_at={selected_history_item_created_at}
          on_selected_history_item_change={set_selected_history_item_created_at}
          commit_button_enabling_trigger_count={
            commit_button_enabling_trigger_count
          }
          chat_input_focus_and_select_key={chat_input_focus_and_select_key}
          chat_input_focus_key={chat_input_focus_key}
          context_size_warning_threshold={context_size_warning_threshold}
        />
      </div>
      <div
        className={cn(styles.slot, {
          [styles['slot--hidden']]: active_view != 'home'
        })}
      >
        <Home
          vscode={vscode}
          is_active={active_view == 'home'}
          on_new_chat={() => {
            set_active_view('main')
            set_main_view_scroll_reset_key((k) => k + 1)
            handle_home_view_type_change(HOME_VIEW_TYPES.WEB)
            handle_web_mode_change('edit-context')
            set_chat_input_focus_and_select_key((k) => k + 1)
          }}
          on_api_call={() => {
            set_active_view('main')
            set_main_view_scroll_reset_key((k) => k + 1)
            handle_home_view_type_change(HOME_VIEW_TYPES.API)
            handle_api_mode_change('edit-context')
            set_chat_input_focus_and_select_key((k) => k + 1)
          }}
          are_donations_visible={are_donations_visible}
          on_toggle_donations_visibility={handle_donations_visibility_change}
          version={version}
        />
      </div>

      {updating_preset && (
        <div className={styles.slot}>
          <UiPage
            on_back_click={edit_preset_back_click_handler}
            title={`Edit ${!updated_preset?.chatbot ? 'Group' : 'Preset'}`}
            header_slot={
              updated_preset?.chatbot && (
                <UiTextButton
                  on_click={handle_preview_preset}
                  disabled={is_preview_disabled}
                  title={
                    !is_connected
                      ? 'Unable to preview when not connected'
                      : web_mode == 'code-completions' && !has_active_editor
                      ? 'Cannot preview in code completion mode without an active editor'
                      : web_mode == 'code-completions' && has_active_selection
                      ? 'Unable to work with text selection'
                      : !has_affixes &&
                        !has_instructions &&
                        web_mode != 'code-completions'
                      ? 'Enter instructions or affixes to preview'
                      : ''
                  }
                >
                  Preview
                </UiTextButton>
              )
            }
          >
            <EditPresetForm
              preset={updating_preset}
              on_update={set_updated_preset}
              on_save={edit_preset_save_handler}
              pick_open_router_model={() => {
                post_message(vscode, { command: 'PICK_OPEN_ROUTER_MODEL' })
              }}
              pick_chatbot={(chatbot_id) => {
                post_message(vscode, { command: 'PICK_CHATBOT', chatbot_id })
              }}
              on_at_sign_in_affix={() => {}}
            />
          </UiPage>
        </div>
      )}

      {files_to_review && (
        <div className={styles.slot}>
          <UiPage
            title="Response Review"
            on_back_click={() => {
              post_message(vscode, { command: 'EDITS_REVIEW', files: [] })
            }}
          >
            <UiResponseReview
              files={files_to_review}
              raw_instructions={raw_instructions}
              has_multiple_workspaces={workspace_folder_count > 1}
              on_discard={() => {
                set_response_history([])
                set_selected_history_item_created_at(undefined)
                post_message(vscode, { command: 'EDITS_REVIEW', files: [] })
              }}
              on_approve={(accepted_files) => {
                set_response_history([])
                post_message(vscode, {
                  command: 'EDITS_REVIEW',
                  files: accepted_files
                })
              }}
              on_focus_file={(file) => {
                post_message(vscode, {
                  command: 'FOCUS_ON_FILE_IN_REVIEW',
                  file_path: file.file_path,
                  workspace_name: file.workspace_name
                })
              }}
              on_go_to_file={(file) => {
                post_message(vscode, {
                  command: 'GO_TO_FILE_IN_REVIEW',
                  file_path: file.file_path,
                  workspace_name: file.workspace_name
                })
              }}
              on_toggle_file={(file) => {
                set_files_to_review((current_files) =>
                  current_files?.map((f) =>
                    f.file_path == file.file_path &&
                    f.workspace_name == file.workspace_name
                      ? { ...f, is_checked: file.is_checked }
                      : f
                  )
                )
                post_message(vscode, {
                  command: 'TOGGLE_FILE_IN_REVIEW',
                  file_path: file.file_path,
                  workspace_name: file.workspace_name,
                  is_checked: file.is_checked
                })
              }}
              on_intelligent_update={(file) => {
                post_message(vscode, {
                  command: 'INTELLIGENT_UPDATE_FILE_IN_REVIEW',
                  file_path: file.file_path,
                  workspace_name: file.workspace_name
                })
              }}
            />
          </UiPage>
        </div>
      )}

      {progress_state && (
        <div className={styles.slot}>
          <UiProgressModal
            title={progress_state.title}
            progress={progress_state.progress}
            tokens_per_second={progress_state.tokens_per_second}
            files={progress_state.files}
            on_cancel={() => {
              set_progress_state(undefined)
              post_message(vscode, { command: 'CANCEL_API_REQUEST' })
            }}
          />
        </div>
      )}

      {chat_initialized_title && (
        <div className={styles.slot}>
          <UiChatInitializedModal
            title={chat_initialized_title}
            duration={3000}
            on_close={() => {
              set_chat_initialized_title(undefined)
            }}
          />
        </div>
      )}

      {commit_message_to_review && (
        <div className={styles.slot}>
          <UiCommitMessageModal
            commit_message={commit_message_to_review}
            on_accept={(message) => {
              post_message(vscode, {
                command: 'ACCEPT_COMMIT_MESSAGE',
                commit_message: message
              })
              set_commit_message_to_review(undefined)
              set_commit_button_enabling_trigger_count((k) => k + 1)
            }}
            on_cancel={() => {
              post_message(vscode, { command: 'CANCEL_COMMIT_MESSAGE' })
              set_commit_message_to_review(undefined)
              set_commit_button_enabling_trigger_count((k) => k + 1)
            }}
          />
        </div>
      )}
    </div>
  )
}
