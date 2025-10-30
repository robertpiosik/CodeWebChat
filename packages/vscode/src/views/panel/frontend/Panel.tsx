import { Main } from './Main'
import { Page as UiPage } from '@ui/components/editor/panel/Page'
import { EditPresetForm } from '@/views/panel/frontend/EditPresetForm'
import { TextButton as UiTextButton } from '@ui/components/editor/panel/TextButton'
import { HOME_VIEW_TYPES } from '../types/home-view-type'
import { Home } from './Home'
import styles from './Panel.module.scss'
import cn from 'classnames'
import { post_message } from './utils/post_message'
import { ResponseReview as UiResponseReview } from '@ui/components/editor/panel/ResponseReview'
import { ProgressModal as UiProgressModal } from '@ui/components/editor/panel/modals/ProgressModal'
import { ChatInitializedModal as UiChatInitializedModal } from '@ui/components/editor/panel/modals/ChatInitializedModal'
import { CommitMessageModal as UiCommitMessageModal } from '@ui/components/editor/panel/modals/CommitMessageModal'
import { StageFilesModal as UiStageFilesModal } from '@ui/components/editor/panel/modals/StageFilesModal'
import { use_panel } from './hooks/use-panel'
import { ApplyingChangesModal as UiApplyingChangesModal } from '@ui/components/editor/panel/modals/ApplyingChangesModal'

const vscode = acquireVsCodeApi()

export const Panel = () => {
  const {
    active_view,
    set_active_view,
    main_view_scroll_reset_key,
    set_main_view_scroll_reset_key,
    version,
    updating_preset,
    set_updating_preset,
    files_to_review,
    set_files_to_review,
    raw_instructions,
    progress_state,
    set_progress_state,
    is_applying_changes,
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
    are_donations_visible,
    updated_preset,
    set_updated_preset,
    ask_instructions,
    edit_instructions,
    no_context_instructions,
    has_active_editor,
    has_active_selection,
    code_completions_instructions,
    home_view_type,
    web_mode,
    api_mode,
    chat_input_focus_key,
    chat_input_focus_and_select_key,
    set_chat_input_focus_and_select_key,
    context_size_warning_threshold,
    handle_instructions_change,
    edit_preset_back_click_handler,
    edit_preset_save_handler,
    handle_preview_preset,
    handle_web_mode_change,
    handle_api_mode_change,
    handle_home_view_type_change,
    handle_donations_visibility_change
  } = use_panel(vscode)

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
                set_response_history((prev) =>
                  prev.filter(
                    (i) => i.created_at != selected_history_item_created_at
                  )
                )
                set_selected_history_item_created_at(undefined)
                post_message(vscode, { command: 'EDITS_REVIEW', files: [] })
              }}
              on_approve={(accepted_files) => {
                set_response_history([])
                set_selected_history_item_created_at(undefined)
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
                  command: 'GO_TO_FILE',
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

      {is_applying_changes && (
        <div className={styles.slot}>
          <UiApplyingChangesModal title="Applying changes..." />
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

      {files_to_stage && (
        <div className={styles.slot}>
          <UiStageFilesModal
            files={files_to_stage}
            on_stage={(selected_files) => {
              post_message(vscode, {
                command: 'PROCEED_WITH_COMMIT',
                files_to_stage: selected_files
              })
              set_files_to_stage(undefined)
            }}
            on_cancel={() => {
              post_message(vscode, { command: 'CANCEL_COMMIT_MESSAGE' })
              set_files_to_stage(undefined)
              set_commit_button_enabling_trigger_count((k) => k + 1)
            }}
            on_go_to_file={(file) => {
              post_message(vscode, {
                command: 'GO_TO_FILE',
                file_path: file
              })
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
