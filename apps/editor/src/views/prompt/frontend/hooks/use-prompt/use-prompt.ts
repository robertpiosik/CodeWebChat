import { useEffect, useState } from 'react'
import {
  BackendMessage,
  FrontendMessage,
  SetupProgress
} from '../../../types/messages'
import { Target, TARGET } from '@shared/types/mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { post_message } from '../../utils/post-message'
import { use_instructions } from './hooks/use-instructions'

export const use_prompt = (vscode: any) => {
  const [active_view, set_active_view] = useState<'home' | 'main'>('home')
  const [main_view_scroll_reset_key, set_main_view_scroll_reset_key] =
    useState(0)
  const [version, set_version] = useState<string>('')
  const [
    apply_button_enabling_trigger_count,
    set_apply_button_enabling_trigger_count
  ] = useState(0)
  const [is_connected, set_is_connected] = useState<boolean>()
  const [target, set_target] = useState<Target>()
  const [web_prompt_type, set_web_mode] = useState<WebPromptType>()
  const [api_prompt_type, set_api_mode] = useState<ApiPromptType>()
  const [chat_input_focus_key, set_chat_input_focus_key] = useState(0)
  const [chat_input_focus_and_select_key, set_chat_input_focus_and_select_key] =
    useState(0)
  const [selected_files_token_count, set_selected_files_token_count] =
    useState<number>(0)
  const [edit_instructions_token_count, set_edit_instructions_token_count] =
    useState<number>(0)
  const [ask_instructions_token_count, set_ask_instructions_token_count] =
    useState<number>(0)

  const {
    ask_about_context_instructions,
    edit_files_instructions,
    handle_instructions_change,
    handle_tab_change,
    handle_new_tab,
    handle_tab_delete,
    handle_tabs_reorder
  } = use_instructions(vscode, target, web_prompt_type, api_prompt_type)

  const [can_undo, set_can_undo] = useState<boolean>(false)
  const [send_with_shift_enter, set_send_with_shift_enter] = useState(false)
  const [is_recording, set_is_recording] = useState(false)
  const [setup_progress, set_setup_progress] = useState<SetupProgress>()
  const [voice_input_push_to_talk, set_voice_input_push_to_talk] =
    useState(false)
  const [is_modern_ui, set_is_modern_ui] = useState(false)

  const handle_paste_image = (content_base64: string) => {
    post_message(vscode, {
      command: 'SAVE_PROMPT_IMAGE',
      content_base64
    })
  }

  const handle_open_image = (hash: string) => {
    post_message(vscode, {
      command: 'OPEN_PROMPT_IMAGE',
      hash
    })
  }

  const handle_paste_long_text = (text: string) => {
    post_message(vscode, {
      command: 'SAVE_PROMPT_PASTED_TEXT',
      text
    })
  }

  const handle_open_pasted_text = (hash: string) => {
    post_message(vscode, {
      command: 'OPEN_PROMPT_PASTED_TEXT',
      hash
    })
  }

  const handle_paste_url = (url: string) => {
    post_message(vscode, {
      command: 'PASTE_URL',
      url
    })
  }

  const handle_set_recording_state = (is_recording: boolean) => {
    post_message(vscode, {
      command: 'SET_RECORDING_STATE',
      is_recording
    })
  }

  const handle_preview_prompt = () => {
    post_message(vscode, {
      command: 'PREVIEW_PROMPT'
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'CONNECTION_STATUS') {
        set_is_connected(message.connected)
      } else if (message.command == 'VERSION') {
        set_version(message.version)
      } else if (message.command == 'TARGET') {
        set_target(message.target)
      } else if (message.command == 'WEB_PROMPT_TYPE') {
        set_web_mode(message.prompt_type)
      } else if (message.command == 'API_PROMPT_TYPE') {
        set_api_mode(message.prompt_type)
      } else if (message.command == 'SEND_WITH_SHIFT_ENTER') {
        set_send_with_shift_enter(message.enabled)
      } else if (message.command == 'FOCUS_PROMPT_FIELD') {
        set_chat_input_focus_key((k) => k + 1)
      } else if (
        message.command == 'RESET_APPLY_BUTTON_TEMPORARY_DISABLED_STATE'
      ) {
        set_apply_button_enabling_trigger_count((c) => c + 1)
      } else if (message.command == 'CAN_UNDO_CHANGED') {
        set_can_undo(message.can_undo)
      } else if (message.command == 'RECORDING_STATE') {
        set_is_recording(message.is_recording)
      } else if (message.command == 'SETUP_PROGRESS') {
        set_setup_progress(message.setup_progress)
      } else if (message.command == 'RETURN_HOME') {
        set_active_view('home')
      } else if (message.command == 'VOICE_INPUT_PUSH_TO_TALK') {
        set_voice_input_push_to_talk(message.enabled)
      } else if (message.command == 'TOKEN_COUNT_UPDATED') {
        set_selected_files_token_count(message.selected_files_token_count)
        set_edit_instructions_token_count(message.edit_instructions_token_count)
        set_ask_instructions_token_count(message.ask_instructions_token_count)
      } else if (message.command == 'IS_MODERN_UI') {
        set_is_modern_ui(message.is_modern_ui)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_VERSION' },
      { command: 'GET_TARGET' },
      { command: 'GET_WEB_PROMPT_TYPE' },
      { command: 'GET_API_PROMPT_TYPE' },
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'GET_SEND_WITH_SHIFT_ENTER' },
      { command: 'REQUEST_CAN_UNDO' },
      { command: 'GET_SETUP_PROGRESS' },
      { command: 'GET_VOICE_INPUT_PUSH_TO_TALK' },
      { command: 'GET_IS_MODERN_UI' },
      { command: 'GET_TOKEN_COUNT' },
      { command: 'GET_SELECTED_FILES' }
    ]
    initial_messages.forEach((message) => post_message(vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_web_prompt_type_change = (
    prompt_type: WebPromptType,
    prevent_selection?: boolean
  ) => {
    set_web_mode(prompt_type)
    if (!prevent_selection) {
      set_chat_input_focus_and_select_key((k) => k + 1)
    }
    set_main_view_scroll_reset_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_WEB_PROMPT_TYPE',
      prompt_type: prompt_type
    })
  }

  const handle_api_prompt_type_change = (
    prompt_type: ApiPromptType,
    prevent_selection?: boolean
  ) => {
    set_api_mode(prompt_type)
    if (!prevent_selection) {
      set_chat_input_focus_and_select_key((k) => k + 1)
    }
    set_main_view_scroll_reset_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_API_PROMPT_TYPE',
      prompt_type: prompt_type
    })
  }

  const handle_target_change = (
    new_target: Target,
    sync_prompt_type?: boolean
  ) => {
    if (target == new_target) return

    if (sync_prompt_type) {
      if (new_target == TARGET.API && web_prompt_type) {
        if (web_prompt_type == 'edit-files') {
          handle_api_prompt_type_change(web_prompt_type, true)
        }
      } else if (new_target == TARGET.WEB && api_prompt_type) {
        handle_web_prompt_type_change(api_prompt_type, true)
      }
    }

    set_target(new_target)
    set_chat_input_focus_key((k) => k + 1)
    set_main_view_scroll_reset_key((k) => k + 1)
    post_message(vscode, {
      command: 'TARGET_CHANGED',
      target: new_target
    })
  }

  const is_setup_complete = setup_progress
    ? Object.values(setup_progress).every((v) => v)
    : true

  return {
    active_view,
    set_active_view,
    main_view_scroll_reset_key,
    set_main_view_scroll_reset_key,
    version,
    apply_button_enabling_trigger_count,
    is_connected,
    ask_about_context_instructions,
    edit_files_instructions,
    target,
    web_prompt_type,
    api_prompt_type,
    chat_input_focus_key,
    set_chat_input_focus_key,
    chat_input_focus_and_select_key,
    can_undo,
    send_with_shift_enter,
    handle_instructions_change,
    handle_web_prompt_type_change,
    handle_api_prompt_type_change,
    handle_target_change,
    handle_paste_image,
    handle_open_image,
    handle_paste_long_text,
    handle_open_pasted_text,
    handle_paste_url,
    is_recording,
    handle_set_recording_state,
    is_setup_complete,
    handle_tab_change,
    handle_new_tab,
    handle_tab_delete,
    handle_tabs_reorder,
    voice_input_push_to_talk,
    is_modern_ui,
    selected_files_token_count,
    edit_instructions_token_count,
    ask_instructions_token_count,
    handle_preview_prompt
  }
}
