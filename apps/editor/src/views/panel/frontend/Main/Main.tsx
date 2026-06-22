import { useEffect, useState } from 'react'
import { MainView } from './MainView'
import { WebConfiguration } from '@shared/types/web-configuration'
import { EditFormat } from '@shared/types/edit-format'
import { MODE, Mode } from '@/views/panel/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import {
  BackendMessage,
  ApiConfigurationsMessage,
  WebConfigurationsMessage,
  FrontendMessage,
  SelectionState
} from '@/views/panel/types/messages'
import { ApiConfiguration } from '@/views/panel/types/messages'
import { post_message } from '../utils/post-message'
import { Configurations as UiConfigurations } from '@ui/components/editor/panel/Configurations'
import { ResponseHistoryItem } from '@shared/types/response-history-item'

type Props = {
  scroll_reset_key: number
  response_history: ResponseHistoryItem[]
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  on_response_history_item_remove: (created_at: number) => void
  vscode: any
  on_web_configuration_edit: (web_configuration: WebConfiguration) => void
  on_show_home: () => void
  is_connected: boolean
  ask_instructions: string
  edit_instructions: string
  no_context_instructions: string
  code_completions_instructions: string
  find_relevant_files_instructions: string
  set_instructions: (
    value: string,
    prompt_type:
      | 'ask-about-context'
      | 'edit-context'
      | 'no-context'
      | 'code-at-cursor'
      | 'find-relevant-files'
  ) => void
  mode: Mode
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_mode_change: (mode: Mode) => void
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  currently_open_file_path?: string
  current_selection?: SelectionState | null
  chat_input_focus_and_select_key: number
  chat_input_focus_key: number
  context_size_warning_threshold: number
  context_file_paths: string[]
  web_configurations_collapsed: boolean
  on_web_configurations_collapsed_change: (is_collapsed: boolean) => void
  send_with_shift_enter: boolean
  api_configurations_collapsed: boolean
  on_api_configurations_collapsed_change: (is_collapsed: boolean) => void
  currently_open_file_text?: string
  on_pasted_lines_click: (path: string, start?: string, end?: string) => void
  are_keyboard_shortcuts_disabled: boolean
  on_open_url: (url: string) => void
  on_open_website: (url: string) => void
  on_paste_image: (base64_content: string) => void
  on_open_image: (hash: string) => void
  on_paste_text: (text: string) => void
  on_open_pasted_text: (hash: string) => void
  on_paste_url: (url: string) => void
  is_recording: boolean
  on_recording_started: () => void
  on_recording_finished: () => void
  is_setup_complete: boolean
  find_relevant_files_shrink_source_code: boolean
  on_find_relevant_files_shrink_source_code_change: (shrink: boolean) => void
  tabs_count: number
  active_tab_index: number
  on_tab_change: (index: number) => void
  on_new_tab: () => void
  on_tab_delete: (index: number) => void
  missing_web_configuration?: boolean
  voice_input_push_to_talk: boolean
  token_count: number
}

export const Main: React.FC<Props> = (props) => {
  const [all_web_configurations, set_all_web_configurations] = useState<WebConfiguration[]>()
  const [
    selected_web_configuration_name_by_mode,
    set_selected_web_configuration_name_by_mode
  ] = useState<{ [T in WebPromptType]?: string }>()
  const [all_api_configurations, set_all_api_configurations] =
    useState<ApiConfiguration[]>()
  const [
    selected_api_configuration_id_by_prompt_type,
    set_selected_api_configuration_id_by_prompt_type
  ] = useState<{ [T in ApiPromptType]?: string }>()
  const [ask_history, set_ask_history] = useState<string[]>()
  const [edit_history, set_edit_history] = useState<string[]>()
  const [no_context_history, set_no_context_history] = useState<string[]>()
  const [code_completions_history, set_code_completions_history] =
    useState<string[]>()
  const [find_relevant_files_history, set_find_relevant_files_history] =
    useState<string[]>()
  const [chat_edit_format, set_chat_edit_format] = useState<EditFormat>()
  const [api_edit_format, set_api_edit_format] = useState<EditFormat>()
  const [caret_position_to_set, set_caret_position_to_set] = useState<
    number | undefined
  >()

  const is_in_code_completions_mode =
    (props.mode == MODE.WEB && props.web_prompt_type == 'code-at-cursor') ||
    (props.mode == MODE.API && props.api_prompt_type == 'code-at-cursor')

  useEffect(() => {
    const handle_message = async (event: MessageEvent) => {
      const message = event.data as BackendMessage
      switch (message.command) {
        case 'WEB_CONFIGURATIONS':
          set_all_web_configurations((message as WebConfigurationsMessage).web_configurations)
          set_selected_web_configuration_name_by_mode(
            (message as WebConfigurationsMessage).selected_web_configuration_name_by_mode
          )
          set_selected_api_configuration_id_by_prompt_type(
            (message as WebConfigurationsMessage).selected_api_configuration_id_by_prompt_type
          )
          break
        case 'API_CONFIGURATIONS':
          set_all_api_configurations(
            (message as ApiConfigurationsMessage).configurations
          )
          break
        case 'CHAT_HISTORY':
          set_ask_history(message.ask_about_context || [])
          set_edit_history(message.edit_context || [])
          set_no_context_history(message.no_context || [])
          set_code_completions_history(message.code_at_cursor || [])
          set_find_relevant_files_history(message.find_relevant_files || [])
          break
        case 'INSTRUCTIONS':
          if (
            message.caret_position !== undefined &&
            message.caret_position >= 0
          )
            set_caret_position_to_set(message.caret_position)
          break
        case 'EDIT_FORMAT':
          set_chat_edit_format(message.chat_edit_format)
          set_api_edit_format(message.api_edit_format)
          break
        case 'SELECTED_WEB_CONFIGURATION_CHANGED':
          set_selected_web_configuration_name_by_mode((prev) => ({
            ...prev,
            [message.prompt_type]: message.name
          }))
          break
        case 'SELECTED_API_CONFIGURATION_CHANGED':
          set_selected_api_configuration_id_by_prompt_type((prev) => ({
            ...prev,
            [message.prompt_type]: message.id
          }))
          break
      }
    }

    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_WEB_CONFIGURATIONS' },
      { command: 'GET_HISTORY' },
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_EDIT_FORMAT' },
      { command: 'GET_API_CONFIGURATIONS' }
    ]
    initial_messages.forEach((message) => post_message(props.vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const current_prompt_type =
    props.mode == MODE.WEB ? props.web_prompt_type : props.api_prompt_type

  const update_chat_history = (instruction: string) => {
    if (!instruction.trim()) {
      return
    }

    if (!current_prompt_type) return

    let history: string[] | undefined
    let set_history: React.Dispatch<React.SetStateAction<string[] | undefined>>

    if (current_prompt_type == 'ask-about-context') {
      history = ask_history
      set_history = set_ask_history
    } else if (current_prompt_type == 'edit-context') {
      history = edit_history
      set_history = set_edit_history
    } else if (current_prompt_type == 'no-context') {
      history = no_context_history
      set_history = set_no_context_history
    } else if (current_prompt_type == 'code-at-cursor') {
      history = code_completions_history
      set_history = set_code_completions_history
    } else if (current_prompt_type == 'find-relevant-files') {
      history = find_relevant_files_history
      set_history = set_find_relevant_files_history
    } else {
      return
    }

    const is_duplicate =
      history && history.length > 0 && history[0] === instruction

    if (!is_duplicate) {
      const new_history = [instruction, ...(history || [])].slice(0, 100)
      set_history(new_history)

      post_message(props.vscode, {
        command: 'SAVE_HISTORY',
        messages: new_history,
        prompt_type: current_prompt_type
      })
    }
  }

  const handle_toggle_web_configuration_pinned = (name: string) => {
    if (all_web_configurations) {
      const updated_web_configurations = all_web_configurations.map((p) =>
        p.name == name ? { ...p, is_pinned: !p.is_pinned } : p
      )

      set_all_web_configurations(updated_web_configurations)

      post_message(props.vscode, {
        command: 'TOGGLE_PINNED_WEB_CONFIGURATION',
        web_configuration_name: name
      })
    }
  }

  const handle_initialize_chats = (params: {
    web_configuration_name?: string
    show_quick_pick?: boolean
    invocation_count: number
  }) => {
    post_message(props.vscode, {
      command: 'SEND_TO_BROWSER',
      web_configuration_name: params.web_configuration_name,
      show_quick_pick: params.show_quick_pick,
      invocation_count: params.invocation_count
    })

    update_chat_history(instructions)
  }

  const handle_copy_to_clipboard = (web_configuration_name?: string) => {
    post_message(props.vscode, {
      command: 'COPY_PROMPT',
      instructions,
      web_configuration_name
    })

    if (instructions.trim()) {
      update_chat_history(instructions)
    }
  }

  const handle_web_configurations_reorder = (reordered_web_configurations: WebConfiguration[]) => {
    if (all_web_configurations) {
      set_all_web_configurations(reordered_web_configurations)
    }

    post_message(props.vscode, {
      command: 'REORDER_WEB_CONFIGURATIONS',
      web_configurations: reordered_web_configurations.map((web_configuration) => ({
        name: web_configuration.name,
        chatbot: web_configuration.chatbot,
        model: web_configuration.model,
        temperature: web_configuration.temperature,
        top_p: web_configuration.top_p,
        thinking_budget: web_configuration.thinking_budget,
        reasoning_effort: web_configuration.reasoning_effort,
        system_instructions: web_configuration.system_instructions,
        options: web_configuration.options,
        port: web_configuration.port,
        new_url: web_configuration.new_url,
        is_pinned: web_configuration.is_pinned
      }))
    })
  }

  const handle_create_api_configuration = (params?: {
    create_on_top?: boolean
    insertion_index?: number
  }) => {
    post_message(props.vscode, {
      command: 'UPSERT_API_CONFIGURATION',
      tool_type: props.api_prompt_type,
      create_on_top: params?.create_on_top,
      insertion_index: params?.insertion_index
    })
  }

  const handle_api_configurations_reorder = (
    reordered_configs: (UiConfigurations.Configuration & { id: string })[]
  ) => {
    if (all_api_configurations) {
      const reordered_api_configs = reordered_configs
        .map((ui_config) => {
          return all_api_configurations.find((c) => c.id == ui_config.id)!
        })
        .filter(Boolean)

      if (reordered_api_configs.length != all_api_configurations.length) {
        return
      }

      set_all_api_configurations(reordered_api_configs)

      post_message(props.vscode, {
        command: 'REORDER_API_CONFIGURATIONS',
        configurations: reordered_api_configs
      })
    }
  }

  const handle_edit_api_configuration = (id: string) => {
    post_message(props.vscode, {
      command: 'UPSERT_API_CONFIGURATION',
      tool_type: props.api_prompt_type,
      api_configuration_id: id
    })
  }

  const handle_delete_api_configuration = (id: string) => {
    post_message(props.vscode, {
      command: 'DELETE_API_CONFIGURATION',
      api_configuration_id: id
    })
  }

  const handle_duplicate_api_configuration = (id: string) => {
    post_message(props.vscode, {
      command: 'UPSERT_API_CONFIGURATION',
      tool_type: props.api_prompt_type,
      duplicate_from_id: id
    })
  }

  const handle_toggle_pinned_api_configuration = (id: string) => {
    post_message(props.vscode, {
      command: 'TOGGLE_PINNED_API_CONFIGURATION',
      api_configuration_id: id
    })
  }

  const handle_create_web_configuration = (
    placement?: 'top' | 'bottom',
    reference_index?: number
  ) => {
    post_message(props.vscode, {
      command: 'CREATE_WEB_CONFIGURATION',
      placement,
      reference_index
    })
  }

  const handle_web_configuration_edit = (name: string) => {
    const web_configuration = all_web_configurations?.find((config) => config.name == name)
    if (web_configuration) props.on_web_configuration_edit(web_configuration)
  }

  const handle_duplicate_web_configuration = (name: string) => {
    post_message(props.vscode, {
      command: 'DUPLICATE_WEB_CONFIGURATION',
      name
    })
  }

  const handle_delete_web_configuration = (name: string) => {
    post_message(props.vscode, {
      command: 'DELETE_WEB_CONFIGURATION',
      name
    })
  }

  const handle_chat_edit_format_change = (edit_format: EditFormat) => {
    set_chat_edit_format(edit_format)
    post_message(props.vscode, {
      command: 'SAVE_EDIT_FORMAT',
      target: 'chat',
      edit_format
    })
  }

  const handle_api_edit_format_change = (edit_format: EditFormat) => {
    set_api_edit_format(edit_format)
    post_message(props.vscode, {
      command: 'SAVE_EDIT_FORMAT',
      target: 'api',
      edit_format
    })
  }

  const handle_caret_position_change = (caret_position: number) => {
    post_message(props.vscode, {
      command: 'CARET_POSITION_CHANGED',
      caret_position
    })
  }

  const get_current_instructions = () => {
    if (is_in_code_completions_mode) {
      return props.code_completions_instructions
    } else if (current_prompt_type == 'find-relevant-files') {
      return props.find_relevant_files_instructions
    }
    if (current_prompt_type == 'ask-about-context')
      return props.ask_instructions
    if (current_prompt_type == 'edit-context') return props.edit_instructions
    if (current_prompt_type == 'no-context')
      return props.no_context_instructions
    return ''
  }

  const handle_edit_context_click = (invocation_count: number) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'EDIT_CONTEXT',
      use_quick_pick: false,
      invocation_count
    })

    update_chat_history(instruction)
  }

  const handle_edit_context_with_quick_pick_click = (
    invocation_count: number
  ) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'EDIT_CONTEXT',
      use_quick_pick: true,
      invocation_count
    })

    update_chat_history(instruction)
  }

  const handle_code_at_cursor_click = (invocation_count: number) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'CODE_AT_CURSOR',
      use_quick_pick: false,
      invocation_count
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_code_at_cursor_with_quick_pick_click = (
    invocation_count: number
  ) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'CODE_AT_CURSOR',
      use_quick_pick: true,
      invocation_count
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_find_relevant_files_click = (invocation_count: number) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'FIND_RELEVANT_FILES',
      use_quick_pick: false,
      invocation_count
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_find_relevant_files_with_quick_pick_click = (
    invocation_count: number
  ) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'FIND_RELEVANT_FILES',
      use_quick_pick: true,
      invocation_count
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_at_sign_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_AT_SIGN_QUICK_PICK',
      is_for_code_completions: is_in_code_completions_mode
    })
  }

  const handle_hash_sign_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_HASH_SIGN_QUICK_PICK',
      is_for_code_completions: is_in_code_completions_mode
    })
  }

  const handle_curly_braces_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_PROMPT_TEMPLATE_QUICK_PICK'
    })
  }

  const handle_api_configuration_click = (id: string) => {
    const instruction = get_current_instructions()

    if (props.api_prompt_type == 'edit-context') {
      post_message(props.vscode, {
        command: 'EDIT_CONTEXT',
        use_quick_pick: false,
        api_configuration_id: id,
        invocation_count: 1
      })
    } else if (props.api_prompt_type == 'code-at-cursor') {
      post_message(props.vscode, {
        command: 'CODE_AT_CURSOR',
        use_quick_pick: false,
        api_configuration_id: id,
        invocation_count: 1
      })
    } else if (props.api_prompt_type == 'find-relevant-files') {
      post_message(props.vscode, {
        command: 'FIND_RELEVANT_FILES',
        use_quick_pick: false,
        api_configuration_id: id,
        invocation_count: 1
      })
    }

    update_chat_history(instruction)
  }

  const handle_quick_action_click = (command: string) => {
    post_message(props.vscode, {
      command: 'EXECUTE_COMMAND',
      command_id: command
    })
  }

  const handle_go_to_file = (file_path: string) => {
    post_message(props.vscode, {
      command: 'GO_TO_FILE',
      file_path
    })
  }

  const instructions =
    current_prompt_type == 'ask-about-context'
      ? props.ask_instructions
      : current_prompt_type == 'edit-context'
        ? props.edit_instructions
        : current_prompt_type == 'no-context'
          ? props.no_context_instructions
          : current_prompt_type == 'code-at-cursor'
            ? props.code_completions_instructions
            : current_prompt_type == 'find-relevant-files'
              ? props.find_relevant_files_instructions
              : ''

  const set_instructions = (value: string) => {
    props.set_instructions(value, current_prompt_type)
  }

  let current_history: string[] | undefined
  if (current_prompt_type == 'ask-about-context') {
    current_history = ask_history
  } else if (current_prompt_type == 'edit-context') {
    current_history = edit_history
  } else if (current_prompt_type == 'no-context') {
    current_history = no_context_history
  } else if (current_prompt_type == 'code-at-cursor') {
    current_history = code_completions_history
  } else if (current_prompt_type == 'find-relevant-files') {
    current_history = find_relevant_files_history
  }

  if (
    all_web_configurations === undefined ||
    all_api_configurations === undefined ||
    ask_history === undefined ||
    edit_history === undefined ||
    no_context_history === undefined ||
    code_completions_history === undefined ||
    find_relevant_files_history === undefined ||
    is_in_code_completions_mode === undefined ||
    instructions === undefined ||
    chat_edit_format === undefined ||
    api_edit_format === undefined
  ) {
    return <></>
  }

  const selected_web_configuration_name =
    selected_web_configuration_name_by_mode?.[props.web_prompt_type]

  const api_configurations =
    props.mode == MODE.API && all_api_configurations ? all_api_configurations : []

  return (
    <MainView
      scroll_reset_key={props.scroll_reset_key}
      on_show_home={props.on_show_home}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      api_configurations={api_configurations}
      on_api_configuration_click={handle_api_configuration_click}
      on_api_configurations_reorder={handle_api_configurations_reorder}
      on_toggle_pinned_api_configuration={handle_toggle_pinned_api_configuration}
      on_edit_api_configuration={handle_edit_api_configuration}
      on_delete_api_configuration={handle_delete_api_configuration}
      on_duplicate_api_configuration={handle_duplicate_api_configuration}
      on_create_api_configuration={handle_create_api_configuration}
      on_at_sign_click={handle_at_sign_click}
      on_hash_sign_click={handle_hash_sign_click}
      on_curly_braces_click={handle_curly_braces_click}
      is_connected={props.is_connected}
      web_configurations={all_web_configurations || []}
      on_create_web_configuration={
        handle_create_web_configuration
      }
      currently_open_file_path={props.currently_open_file_path}
      on_quick_action_click={handle_quick_action_click}
      current_selection={props.current_selection}
      chat_history={current_history || []}
        token_count={props.token_count}
      web_prompt_type={props.web_prompt_type}
      api_prompt_type={props.api_prompt_type}
      context_size_warning_threshold={props.context_size_warning_threshold}
      on_web_prompt_type_change={props.on_web_prompt_type_change}
      on_api_prompt_type_change={props.on_api_prompt_type_change}
      chat_edit_format={chat_edit_format}
      api_edit_format={api_edit_format}
      on_chat_edit_format_change={handle_chat_edit_format_change}
      on_api_edit_format_change={handle_api_edit_format_change}
      on_web_configurations_reorder={handle_web_configurations_reorder}
      on_web_configuration_edit={handle_web_configuration_edit}
      on_duplicate_web_configuration={handle_duplicate_web_configuration}
      on_delete_web_configuration={handle_delete_web_configuration}
      on_toggle_web_configuration_pinned={handle_toggle_web_configuration_pinned}
      selected_web_configuration_name={selected_web_configuration_name}
      selected_api_configuration_id={
        selected_api_configuration_id_by_prompt_type?.[props.api_prompt_type]
      }
      instructions={instructions}
      set_instructions={set_instructions}
      on_caret_position_change={handle_caret_position_change}
      mode={props.mode}
      on_mode_change={props.on_mode_change}
      on_edit_context_click={handle_edit_context_click}
      on_edit_context_with_quick_pick_click={
        handle_edit_context_with_quick_pick_click
      }
      on_code_at_cursor_click={handle_code_at_cursor_click}
      on_code_at_cursor_with_quick_pick_click={
        handle_code_at_cursor_with_quick_pick_click
      }
      on_find_relevant_files_click={handle_find_relevant_files_click}
      on_find_relevant_files_with_quick_pick_click={
        handle_find_relevant_files_with_quick_pick_click
      }
      caret_position_to_set={caret_position_to_set}
      on_caret_position_set={() => set_caret_position_to_set(undefined)}
      chat_input_focus_and_select_key={props.chat_input_focus_and_select_key}
      chat_input_focus_key={props.chat_input_focus_key}
      response_history={props.response_history}
      on_response_history_item_click={props.on_response_history_item_click}
      selected_history_item_created_at={props.selected_history_item_created_at}
      on_selected_history_item_change={props.on_selected_history_item_change}
      on_response_history_item_remove={props.on_response_history_item_remove}
      context_file_paths={props.context_file_paths}
      web_configurations_collapsed={props.web_configurations_collapsed}
      send_with_shift_enter={props.send_with_shift_enter}
      on_web_configurations_collapsed_change={props.on_web_configurations_collapsed_change}
      api_configurations_collapsed={props.api_configurations_collapsed}
      on_api_configurations_collapsed_change={
        props.on_api_configurations_collapsed_change
      }
      on_go_to_file={handle_go_to_file}
      on_pasted_lines_click={props.on_pasted_lines_click}
      currently_open_file_text={props.currently_open_file_text}
      are_keyboard_shortcuts_disabled={props.are_keyboard_shortcuts_disabled}
      on_open_url={props.on_open_url}
      on_open_website={props.on_open_website}
      on_paste_image={props.on_paste_image}
      on_open_image={props.on_open_image}
      on_paste_text={props.on_paste_text}
      on_open_pasted_text={props.on_open_pasted_text}
      on_paste_url={props.on_paste_url}
      is_recording={props.is_recording}
      on_recording_started={props.on_recording_started}
      on_recording_finished={props.on_recording_finished}
      find_relevant_files_shrink_source_code={
        props.find_relevant_files_shrink_source_code
      }
      on_find_relevant_files_shrink_source_code_change={
        props.on_find_relevant_files_shrink_source_code_change
      }
      is_setup_complete={props.is_setup_complete}
      tabs_count={props.tabs_count}
      active_tab_index={props.active_tab_index}
      on_tab_change={props.on_tab_change}
      on_new_tab={props.on_new_tab}
      on_tab_delete={props.on_tab_delete}
      voice_input_push_to_talk={props.voice_input_push_to_talk}
    />
  )
}
