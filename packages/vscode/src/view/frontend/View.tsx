import { Home } from './home'
import { useEffect, useState } from 'react'
import { Page as UiPage } from '@ui/components/editor/Page'
import { EditPresetForm } from '@/view/frontend/EditPresetForm'
import { Preset } from '@shared/types/preset'
import { BackendMessage, FrontendMessage } from '../types/messages'
import { TextButton as UiTextButton } from '@ui/components/editor/TextButton'
import { HOME_VIEW_TYPES, HomeViewType } from '../types/home-view-type'
import { Intro } from './intro'
import styles from './View.module.scss'
import cn from 'classnames'
import { ApiMode, WebMode } from '@shared/types/modes'
import { post_message } from './utils/post_message'
import { FileInReview } from '@shared/types/file-in-review'
import { CodeReview as UiCodeReview } from '@ui/components/editor/CodeReview'

const vscode = acquireVsCodeApi()

export const View = () => {
  const [active_view, set_active_view] = useState<'intro' | 'home'>('intro')
  const [version, set_version] = useState<string>('')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [files_to_review, set_files_to_review] = useState<FileInReview[]>([])
  const [has_multiple_workspaces, set_has_multiple_workspaces] = useState(false)
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
  const [home_view_type, set_home_view_type] = useState<HomeViewType>()
  const [web_mode, set_web_mode] = useState<WebMode>()
  const [api_mode, set_api_mode] = useState<ApiMode>()

  const handle_mouse_enter = () => {
    post_message(vscode, {
      command: 'CHECK_CLIPBOARD_FOR_APPLY'
    })
  }

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
        set_files_to_review(message.files)
      } else if (message.command == 'CODE_REVIEW_FINISHED') {
        set_files_to_review([])
      } else if (message.command == 'HAS_MULTIPLE_WORKSPACES') {
        set_has_multiple_workspaces(message.value)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_VERSION' },
      { command: 'GET_HOME_VIEW_TYPE' },
      { command: 'GET_WEB_MODE' },
      { command: 'GET_API_MODE' },
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_HAS_MULTIPLE_WORKSPACES' }
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
    post_message(vscode, {
      command: 'SAVE_HOME_VIEW_TYPE',
      view_type
    })
  }

  if (
    ask_instructions === undefined ||
    edit_instructions === undefined ||
    no_context_instructions === undefined ||
    !version ||
    code_completions_instructions === undefined ||
    home_view_type === undefined ||
    web_mode === undefined ||
    is_connected === undefined ||
    api_mode === undefined ||
    has_active_editor === undefined ||
    has_active_selection === undefined
  ) {
    return null
  }

  let overlay: React.ReactNode | undefined = undefined

  const is_for_code_completions =
    (home_view_type == HOME_VIEW_TYPES.WEB && web_mode == 'code-completions') ||
    (home_view_type == HOME_VIEW_TYPES.API && api_mode == 'code-completions')

  if (updating_preset) {
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

    overlay = (
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
          on_at_sign_in_affix={() => {
            post_message(vscode, {
              command: 'SHOW_AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX',
              is_for_code_completions: is_for_code_completions
            })
          }}
        />
      </UiPage>
    )
  }

  if (files_to_review.length > 0) {
    overlay = (
      <UiPage title="Code Review">
        <UiCodeReview
          files={files_to_review}
          has_multiple_workspaces={has_multiple_workspaces}
          on_reject_all={() => {
            post_message(vscode, { command: 'EDITS_REVIEW', files: [] })
          }}
          on_accept={(accepted_files) => {
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
        />
      </UiPage>
    )
  }

  return (
    <div className={styles.container} onMouseEnter={handle_mouse_enter}>
      {overlay && (
        <div className={cn(styles.slot, styles['slot--overlay'])}>
          {overlay}
        </div>
      )}
      <div
        className={cn(styles.slot, {
          [styles['slot--hidden']]: active_view != 'home'
        })}
      >
        <Home
          vscode={vscode}
          on_preset_edit={(preset) => {
            set_updating_preset(preset)
            set_updated_preset(preset)
          }}
          is_connected={is_connected}
          on_show_intro={() => set_active_view('intro')}
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
        />
      </div>
      <div
        className={cn(styles.slot, {
          [styles['slot--hidden']]: active_view != 'intro'
        })}
      >
        <Intro
          on_new_chat={() => {
            set_active_view('home')
            handle_home_view_type_change(HOME_VIEW_TYPES.WEB)
            handle_web_mode_change('edit-context')
          }}
          on_api_call={() => {
            set_active_view('home')
            handle_home_view_type_change(HOME_VIEW_TYPES.API)
            handle_api_mode_change('edit-context')
          }}
          version={version}
        />
      </div>
    </div>
  )
}
