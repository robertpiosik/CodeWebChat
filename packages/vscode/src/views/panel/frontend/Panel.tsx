import { useState } from 'react'
import { Main } from './Main'
import { Page as UiPage } from '@ui/components/editor/panel/Page'
import { EditPresetForm } from '@/views/panel/frontend/components/edit-preset-form/EditPresetForm'
import { TextButton as UiTextButton } from '@ui/components/editor/panel/TextButton'
import { MODE } from '../types/main-view-mode'
import { Home } from './Home'
import styles from './Panel.module.scss'
import cn from 'classnames'
import { post_message } from './utils/post_message'
import { ResponsePreview as UiResponsePreview } from '@ui/components/editor/panel/ResponsePreview'
import { ProgressModal as UiProgressModal } from '@ui/components/editor/panel/modals/ProgressModal'
import { AutoClosingModal as UiAutoClosingModal } from '@ui/components/editor/panel/modals/AutoClosingModal'
import { CommitMessageModal as UiCommitMessageModal } from '@ui/components/editor/panel/modals/CommitMessageModal'
import { StageFilesModal as UiStageFilesModal } from '@ui/components/editor/panel/modals/StageFilesModal'
import { EditCheckpointDescriptionModal as UiEditCheckpointDescriptionModal } from '@ui/components/editor/panel/modals/EditCheckpointDescriptionModal'
import { use_panel } from './hooks/use-panel'
import { FileInPreview } from '@shared/types/file-in-preview'
import { LayoutContext } from './contexts/LayoutContext'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { Layout } from './components/Layout/Layout'
import { ResponsePreviewFooter as UiResponsePreviewFooter } from '@ui/components/editor/panel/ResponsePreviewFooter'
import { EditPresetFormFooter } from './components/edit-preset-form/EditPresetFormFooter'
import { Donations } from '@ui/components/editor/panel/Donations/Donations'
import { use_latest_donations } from './hooks/latest-donations'
import { DonationsFooter } from './components/donations/DonationsFooter'

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
    items_to_review,
    set_items_to_review,
    raw_instructions,
    progress_state,
    set_progress_state,
    auto_closing_modal_title,
    set_auto_closing_modal_title,
    commit_message_to_review,
    set_commit_message_to_review,
    files_to_stage,
    set_files_to_stage,
    commit_button_enabling_trigger_count,
    set_commit_button_enabling_trigger_count,
    selected_history_item_created_at,
    set_selected_history_item_created_at,
    response_history,
    checkpoints,
    preview_item_created_at,
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
    currently_open_file_text,
    mode,
    web_prompt_type,
    api_prompt_type,
    chat_input_focus_key,
    chat_input_focus_and_select_key,
    set_chat_input_focus_and_select_key,
    context_size_warning_threshold,
    has_changes_to_commit,
    can_undo,
    context_file_paths,
    presets_collapsed,
    configurations_collapsed,
    handle_instructions_change,
    edit_preset_back_click_handler,
    edit_preset_save_handler,
    handle_preview_preset,
    handle_web_prompt_type_change,
    handle_api_prompt_type_change,
    handle_mode_change,
    handle_presets_collapsed_change,
    handle_configurations_collapsed_change,
    handle_remove_response_history_item
  } = use_panel(vscode)

  const [checkpoint_to_edit, set_checkpoint_to_edit] = useState<
    { timestamp: number; description: string } | undefined
  >(undefined)

  const { viewing_donations, set_viewing_donations, ...donations_state } =
    use_latest_donations()

  if (
    ask_instructions === undefined ||
    edit_instructions === undefined ||
    no_context_instructions === undefined ||
    !version ||
    code_completions_instructions === undefined ||
    mode === undefined ||
    web_prompt_type === undefined ||
    is_connected === undefined ||
    api_prompt_type === undefined ||
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
    (mode == MODE.WEB && web_prompt_type == 'code-completions') ||
    (mode == MODE.API && api_prompt_type == 'code-completions')

  const get_current_instructions = () => {
    if (is_for_code_completions) {
      return code_completions_instructions
    }
    const prompt_type = mode == MODE.WEB ? web_prompt_type : api_prompt_type
    if (prompt_type == 'ask') return ask_instructions
    if (prompt_type == 'edit-context') return edit_instructions
    if (prompt_type == 'no-context') return no_context_instructions
    return ''
  }

  const has_affixes =
    !!updated_preset?.prompt_prefix || !!updated_preset?.prompt_suffix
  const has_instructions = !!get_current_instructions().trim()
  const is_preview_disabled =
    !is_connected ||
    (!has_affixes &&
      !has_instructions &&
      web_prompt_type != 'code-completions') ||
    (web_prompt_type == 'code-completions' &&
      (!has_active_editor || has_active_selection))

  const handle_apply_click = () => {
    post_message(vscode, {
      command: 'EXECUTE_COMMAND',
      command_id: 'codeWebChat.applyChatResponse'
    })
  }

  const handle_undo_click = () => {
    post_message(vscode, {
      command: 'UNDO'
    })
  }

  const handle_commit_click = () => {
    post_message(vscode, {
      command: 'COMMIT_CHANGES'
    })
  }

  const handle_response_history_item_click = (item: ResponseHistoryItem) => {
    post_message(vscode, {
      command: 'APPLY_RESPONSE_FROM_HISTORY',
      response: item.response,
      raw_instructions: item.raw_instructions,
      files: item.files,
      created_at: item.created_at
    })
  }

  const layout_context_value = {
    can_undo,
    has_changes_to_commit,
    on_apply_click: handle_apply_click,
    on_undo_click: handle_undo_click,
    on_commit_click: handle_commit_click,
    commit_button_enabling_trigger_count
  }

  return (
    <LayoutContext.Provider value={layout_context_value}>
      <div className={styles.container}>
        <div className={styles.slot}>
          <Layout on_donate_click={() => set_viewing_donations(true)}>
            <div
              className={cn(styles.content, {
                [styles['content--hidden']]: active_view != 'main'
              })}
            >
              <Main
                scroll_reset_key={main_view_scroll_reset_key}
                vscode={vscode}
                on_preset_edit={(preset) => {
                  post_message(vscode, {
                    command: 'UPDATE_LAST_USED_PRESET',
                    preset_name: preset.name!
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
                mode={mode}
                web_prompt_type={web_prompt_type}
                api_prompt_type={api_prompt_type}
                on_mode_change={handle_mode_change}
                has_active_editor={has_active_editor}
                has_active_selection={has_active_selection}
                on_web_prompt_type_change={handle_web_prompt_type_change}
                on_api_prompt_type_change={handle_api_prompt_type_change}
                response_history={response_history}
                on_response_history_item_click={
                  handle_response_history_item_click
                }
                selected_history_item_created_at={
                  selected_history_item_created_at
                }
                on_selected_history_item_change={
                  set_selected_history_item_created_at
                }
                on_response_history_item_remove={
                  handle_remove_response_history_item
                }
                chat_input_focus_and_select_key={
                  chat_input_focus_and_select_key
                }
                chat_input_focus_key={chat_input_focus_key}
                context_size_warning_threshold={context_size_warning_threshold}
                context_file_paths={context_file_paths}
                presets_collapsed={presets_collapsed}
                on_presets_collapsed_change={handle_presets_collapsed_change}
                configurations_collapsed={configurations_collapsed}
                on_configurations_collapsed_change={
                  handle_configurations_collapsed_change
                }
                currently_open_file_text={currently_open_file_text}
              />
            </div>
            <div
              className={cn(styles.content, {
                [styles['content--hidden']]: active_view != 'home'
              })}
            >
              <Home
                vscode={vscode}
                is_active={active_view == 'home'}
                on_chatbots_click={() => {
                  set_active_view('main')
                  set_main_view_scroll_reset_key((k) => k + 1)
                  handle_mode_change(MODE.WEB)
                  handle_web_prompt_type_change('edit-context')
                  set_chat_input_focus_and_select_key((k) => k + 1)
                }}
                on_api_calls_click={() => {
                  set_active_view('main')
                  set_main_view_scroll_reset_key((k) => k + 1)
                  handle_mode_change(MODE.API)
                  handle_api_prompt_type_change('edit-context')
                  set_chat_input_focus_and_select_key((k) => k + 1)
                }}
                version={version}
                checkpoints={checkpoints}
                response_history={response_history}
                on_response_history_item_click={
                  handle_response_history_item_click
                }
                selected_history_item_created_at={
                  selected_history_item_created_at
                }
                on_selected_history_item_change={
                  set_selected_history_item_created_at
                }
                on_response_history_item_remove={
                  handle_remove_response_history_item
                }
                on_toggle_checkpoint_starred={(timestamp: number) => {
                  post_message(vscode, {
                    command: 'TOGGLE_CHECKPOINT_STAR',
                    timestamp: timestamp
                  })
                }}
                on_restore_checkpoint={(timestamp: number) => {
                  post_message(vscode, {
                    command: 'RESTORE_CHECKPOINT',
                    timestamp
                  })
                }}
                on_edit_checkpoint_description={(timestamp) => {
                  const checkpoint = checkpoints.find(
                    (c) => c.timestamp == timestamp
                  )
                  if (checkpoint) {
                    set_checkpoint_to_edit({
                      timestamp: checkpoint.timestamp,
                      description: checkpoint.description || ''
                    })
                  }
                }}
                on_delete_checkpoint={(timestamp) => {
                  post_message(vscode, {
                    command: 'DELETE_CHECKPOINT',
                    timestamp
                  })
                }}
              />
            </div>
          </Layout>
        </div>

        {updating_preset && (
          <div className={styles.slot}>
            <UiPage
              on_back_click={edit_preset_back_click_handler}
              footer_slot={
                <EditPresetFormFooter on_save={edit_preset_save_handler} />
              }
              title={`Edit ${!updated_preset?.chatbot ? 'Group' : 'Preset'}`}
              header_slot={
                updated_preset?.chatbot && (
                  <UiTextButton
                    on_click={handle_preview_preset}
                    disabled={is_preview_disabled}
                    title={
                      !is_connected
                        ? 'Unable to preview when not connected'
                        : web_prompt_type == 'code-completions' &&
                            !has_active_editor
                          ? 'Cannot preview in code completion mode without an active editor'
                          : web_prompt_type == 'code-completions' &&
                              has_active_selection
                            ? 'Unable to work with text selection'
                            : !has_affixes &&
                                !has_instructions &&
                                web_prompt_type != 'code-completions'
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

        {viewing_donations && (
          <div className={styles.slot}>
            <UiPage
              title="Recent Donations"
              on_back_click={() => set_viewing_donations(false)}
              footer_slot={
                <DonationsFooter
                  on_close={() => set_viewing_donations(false)}
                />
              }
            >
              <Donations
                donations={donations_state.donations}
                is_fetching={donations_state.is_fetching}
                is_revalidating={donations_state.is_revalidating}
                on_fetch_next_page={donations_state.on_fetch_next_page}
                has_more={donations_state.has_more}
              />
            </UiPage>
          </div>
        )}

        {items_to_review && (
          <div className={styles.slot}>
            <UiPage
              title="Response Preview"
              on_back_click={() => {
                post_message(vscode, { command: 'RESPONSE_PREVIEW', files: [] })
              }}
              footer_slot={
                <UiResponsePreviewFooter
                  on_reject={() => {
                    if (preview_item_created_at) {
                      set_response_history((prev) =>
                        prev.filter(
                          (i) => i.created_at != preview_item_created_at
                        )
                      )
                    }
                    set_selected_history_item_created_at(undefined)
                    post_message(vscode, {
                      command: 'RESPONSE_PREVIEW',
                      files: [],
                      created_at: preview_item_created_at
                    })
                  }}
                  on_accept={() => {
                    const accepted_files = items_to_review.filter(
                      (f) => f.type === 'file' && f.is_checked
                    ) as FileInPreview[]
                    set_response_history([])
                    set_selected_history_item_created_at(undefined)
                    post_message(vscode, {
                      command: 'RESPONSE_PREVIEW',
                      files: accepted_files,
                      created_at: preview_item_created_at
                    })
                  }}
                  is_accept_disabled={
                    items_to_review.filter(
                      (f) => f.type == 'file' && f.is_checked
                    ).length == 0
                  }
                />
              }
            >
              <UiResponsePreview
                items={items_to_review}
                raw_instructions={raw_instructions}
                has_multiple_workspaces={workspace_folder_count > 1}
                on_focus_file={(file) => {
                  post_message(vscode, {
                    command: 'FOCUS_ON_FILE_IN_PREVIEW',
                    file_path: file.file_path,
                    workspace_name: file.workspace_name
                  })
                }}
                on_go_to_file={(file) => {
                  post_message(vscode, {
                    command: 'GO_TO_FILE',
                    file_path: file.workspace_name
                      ? `${file.workspace_name}/${file.file_path}`
                      : file.file_path
                  })
                }}
                on_toggle_file={(file) => {
                  set_items_to_review((current_items) =>
                    current_items?.map((f) =>
                      f.type == 'file' &&
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
                    command: 'INTELLIGENT_UPDATE_FILE_IN_PREVIEW',
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
              show_elapsed_time={progress_state.show_elapsed_time}
              delay_visibility={progress_state.delay_visibility}
              on_cancel={
                progress_state.cancellable
                  ? () => {
                      set_progress_state(undefined)
                      post_message(vscode, { command: 'CANCEL_API_REQUEST' })
                    }
                  : undefined
              }
            />
          </div>
        )}

        {auto_closing_modal_title && (
          <div className={styles.slot}>
            <UiAutoClosingModal
              title={auto_closing_modal_title}
              duration={3000}
              on_close={() => {
                set_auto_closing_modal_title(undefined)
              }}
            />
          </div>
        )}

        {checkpoint_to_edit && (
          <div className={styles.slot}>
            <UiEditCheckpointDescriptionModal
              description={checkpoint_to_edit.description}
              on_save={(description) => {
                post_message(vscode, {
                  command: 'UPDATE_CHECKPOINT_DESCRIPTION',
                  timestamp: checkpoint_to_edit.timestamp,
                  description
                })
                set_checkpoint_to_edit(undefined)
              }}
              on_cancel={() => set_checkpoint_to_edit(undefined)}
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
              on_show_diff={(file) => {
                post_message(vscode, {
                  command: 'SHOW_DIFF',
                  file_path: file
                })
              }}
            />
          </div>
        )}

        {commit_message_to_review && (
          <div className={styles.slot}>
            <UiCommitMessageModal
              commit_message={commit_message_to_review.commit_message}
              auto_accept_after_seconds={
                commit_message_to_review.auto_accept_after_seconds
              }
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
    </LayoutContext.Provider>
  )
}
