import { useEffect, useState } from 'react'
import {
  BackendMessage,
  FrontendMessage,
  SetupProgress
} from '../../../types/messages'
import { Checkpoint } from '../../../types/messages'
import { Mode, MODE } from '../../../types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { post_message } from '../../utils/post_message'
import { use_instructions } from './use-instructions'

export const use_panel = (vscode: any) => {
  const [active_view, set_active_view] = useState<'home' | 'main'>('home')
  const [main_view_scroll_reset_key, set_main_view_scroll_reset_key] =
    useState(0)
  const [version, set_version] = useState<string>('')
  const [
    apply_button_enabling_trigger_count,
    set_apply_button_enabling_trigger_count
  ] = useState(0)
  const [checkpoints, set_checkpoints] = useState<Checkpoint[]>([])
  const [is_connected, set_is_connected] = useState<boolean>()
  const [mode, set_mode] = useState<Mode>()
  const [web_prompt_type, set_web_mode] = useState<WebPromptType>()
  const [api_prompt_type, set_api_mode] = useState<ApiPromptType>()
  const [chat_input_focus_key, set_chat_input_focus_key] = useState(0)
  const [chat_input_focus_and_select_key, set_chat_input_focus_and_select_key] =
    useState(0)

  const {
    ask_about_context_instructions,
    edit_context_instructions,
    no_context_instructions,
    code_at_cursor_instructions,
    prune_context_instructions,
    handle_instructions_change,
    handle_tab_change,
    handle_new_tab,
    handle_tab_delete
  } = use_instructions(vscode, mode, web_prompt_type, api_prompt_type)

  const [context_size_warning_threshold, set_context_size_warning_threshold] =
    useState<number>()
  const [can_undo, set_can_undo] = useState<boolean>(false)
  const [presets_collapsed_by_web_mode, set_presets_collapsed_by_web_mode] =
    useState<{ [mode in WebPromptType]?: boolean }>({})
  const [send_with_shift_enter, set_send_with_shift_enter] = useState(false)
  const [is_timeline_collapsed, set_is_timeline_collapsed] = useState(false)
  const [
    configurations_collapsed_by_api_mode,
    set_configurations_collapsed_by_api_mode
  ] = useState<{ [mode in ApiPromptType]?: boolean }>({})
  const [
    prune_context_instructions_prefix,
    set_prune_context_instructions_prefix
  ] = useState<string>('')
  const [is_recording, set_is_recording] = useState(false)
  const [setup_progress, set_setup_progress] = useState<SetupProgress>()

  const handle_task_forward = (text: string) => {
    handle_instructions_change(text, 'edit-context')
    set_active_view('main')
    set_main_view_scroll_reset_key((k) => k + 1)
  }

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

  const handle_prune_context_instructions_prefix_change = (prefix: string) => {
    post_message(vscode, {
      command: 'SAVE_PRUNE_CONTEXT_INSTRUCTIONS_PREFIX',
      prefix
    })
  }

  const handle_set_recording_state = (is_recording: boolean) => {
    post_message(vscode, {
      command: 'SET_RECORDING_STATE',
      is_recording
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'CONNECTION_STATUS') {
        set_is_connected(message.connected)
      } else if (message.command == 'VERSION') {
        set_version(message.version)
      } else if (message.command == 'MODE') {
        set_mode(message.mode)
      } else if (message.command == 'WEB_PROMPT_TYPE') {
        set_web_mode(message.prompt_type)
      } else if (message.command == 'API_PROMPT_TYPE') {
        set_api_mode(message.prompt_type)
      } else if (message.command == 'COLLAPSED_STATES') {
        set_presets_collapsed_by_web_mode(message.presets_collapsed_by_web_mode)
        set_configurations_collapsed_by_api_mode(
          message.configurations_collapsed_by_api_mode
        )
        set_is_timeline_collapsed(message.is_timeline_collapsed)
      } else if (message.command == 'CHECKPOINTS') {
        set_checkpoints(message.checkpoints)
      } else if (message.command == 'SEND_WITH_SHIFT_ENTER') {
        set_send_with_shift_enter(message.enabled)
      } else if (message.command == 'FOCUS_PROMPT_FIELD') {
        set_chat_input_focus_key((k) => k + 1)
      } else if (
        message.command == 'RESET_APPLY_BUTTON_TEMPORARY_DISABLED_STATE'
      ) {
        set_apply_button_enabling_trigger_count((c) => c + 1)
      } else if (message.command == 'CONTEXT_SIZE_WARNING_THRESHOLD') {
        set_context_size_warning_threshold(message.threshold)
      } else if (message.command == 'CAN_UNDO_CHANGED') {
        set_can_undo(message.can_undo)
      } else if (message.command == 'PRUNE_CONTEXT_INSTRUCTIONS_PREFIX') {
        set_prune_context_instructions_prefix(message.prefix)
      } else if (message.command == 'RECORDING_STATE') {
        set_is_recording(message.is_recording)
      } else if (message.command == 'SETUP_PROGRESS') {
        set_setup_progress(message.setup_progress)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_VERSION' },
      { command: 'GET_MODE' },
      { command: 'GET_WEB_PROMPT_TYPE' },
      { command: 'GET_API_PROMPT_TYPE' },
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'GET_CONTEXT_SIZE_WARNING_THRESHOLD' },
      { command: 'GET_SEND_WITH_SHIFT_ENTER' },
      { command: 'GET_COLLAPSED_STATES' },
      { command: 'GET_CHECKPOINTS' },
      { command: 'REQUEST_CAN_UNDO' },
      { command: 'GET_PRUNE_CONTEXT_INSTRUCTIONS_PREFIX' },
      { command: 'GET_SETUP_PROGRESS' }
    ]
    initial_messages.forEach((message) => post_message(vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_timeline_collapsed_change = (is_collapsed: boolean) => {
    set_is_timeline_collapsed(is_collapsed)
    post_message(vscode, {
      command: 'SAVE_COMPONENT_COLLAPSED_STATE',
      component: 'timeline',
      is_collapsed
    })
  }

  const handle_web_prompt_type_change = (prompt_type: WebPromptType) => {
    set_web_mode(prompt_type)
    set_chat_input_focus_and_select_key((k) => k + 1)
    set_main_view_scroll_reset_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_WEB_PROMPT_TYPE',
      prompt_type: prompt_type
    })
  }

  const handle_api_prompt_type_change = (prompt_type: ApiPromptType) => {
    set_api_mode(prompt_type)
    set_chat_input_focus_and_select_key((k) => k + 1)
    set_main_view_scroll_reset_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_API_PROMPT_TYPE',
      prompt_type: prompt_type
    })
  }

  const handle_mode_change = (new_mode: Mode) => {
    if (mode == new_mode) return

    if (new_mode == MODE.API && web_prompt_type) {
      if (
        web_prompt_type == 'edit-context' ||
        web_prompt_type == 'code-at-cursor' ||
        web_prompt_type == 'prune-context'
      ) {
        handle_api_prompt_type_change(web_prompt_type)
      }
    } else if (new_mode == MODE.WEB && api_prompt_type) {
      handle_web_prompt_type_change(api_prompt_type)
    }

    set_mode(new_mode)
    set_chat_input_focus_key((k) => k + 1)
    set_main_view_scroll_reset_key((k) => k + 1)
    post_message(vscode, {
      command: 'SAVE_MODE',
      mode: new_mode
    })
  }

  const handle_presets_collapsed_change = (is_collapsed: boolean) => {
    if (!web_prompt_type) return
    set_presets_collapsed_by_web_mode((prev) => ({
      ...prev,
      [web_prompt_type]: is_collapsed
    }))
    post_message(vscode, {
      command: 'SAVE_COMPONENT_COLLAPSED_STATE',
      component: 'presets',
      is_collapsed,
      prompt_type: web_prompt_type
    })
  }

  const handle_configurations_collapsed_change = (is_collapsed: boolean) => {
    if (!api_prompt_type) return
    set_configurations_collapsed_by_api_mode((prev) => ({
      ...prev,
      [api_prompt_type]: is_collapsed
    }))
    post_message(vscode, {
      command: 'SAVE_COMPONENT_COLLAPSED_STATE',
      component: 'configurations',
      is_collapsed,
      prompt_type: api_prompt_type
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
    checkpoints,
    is_connected,
    ask_about_context_instructions,
    edit_context_instructions,
    no_context_instructions,
    code_at_cursor_instructions,
    prune_context_instructions,
    mode,
    web_prompt_type,
    api_prompt_type,
    chat_input_focus_key,
    chat_input_focus_and_select_key,
    set_chat_input_focus_and_select_key,
    context_size_warning_threshold,
    can_undo,
    presets_collapsed: web_prompt_type
      ? (presets_collapsed_by_web_mode[web_prompt_type] ?? false)
      : false,
    send_with_shift_enter,
    configurations_collapsed: api_prompt_type
      ? (configurations_collapsed_by_api_mode[api_prompt_type] ?? false)
      : false,
    is_timeline_collapsed,
    handle_task_forward,
    prune_context_instructions_prefix,
    handle_instructions_change,
    handle_web_prompt_type_change,
    handle_api_prompt_type_change,
    handle_mode_change,
    handle_presets_collapsed_change,
    handle_timeline_collapsed_change,
    handle_configurations_collapsed_change,
    handle_prune_context_instructions_prefix_change,
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
    handle_tab_delete
  }
}
