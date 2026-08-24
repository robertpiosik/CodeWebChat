import { useEffect, useState } from 'react'
import { MainView } from './MainView'
import { WebConfiguration } from '@shared/types/web-configuration'
import { EditFormat } from '@shared/types/edit-format'
import { MODE, Mode } from '@/views/prompt/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import {
  BackendMessage,
  ApiConfigurationsMessage,
  WebConfigurationsMessage,
  FrontendMessage,
  SelectionState
} from '@/views/prompt/types/messages'
import { ApiConfiguration } from '@/views/prompt/types/messages'
import { post_message } from '../utils/post-message'
import { Configurations as UiConfigurations } from '@ui/components/editor/prompt/Configurations'
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
  on_api_configuration_edit: (api_configuration: ApiConfiguration) => void
  on_show_home: () => void
  is_connected: boolean
  ask_instructions: string
  edit_instructions: string
  set_instructions: (
    value: string,
    prompt_type: 'ask-about-files' | 'edit-files'
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
  selected_files: string[]
  send_with_shift_enter: boolean
  currently_open_file_text?: string
  on_pasted_lines_click: (path: string, start?: string, end?: string) => void
  are_keyboard_shortcuts_disabled: boolean
  on_open_url: (url: string) => void
  on_open_website: (url: string) => void
  on_paste_image: (base64_content: string) => void
  on_open_image: (hash: string) => void
  on_paste_long_text: (text: string) => void
  on_open_pasted_text: (hash: string) => void
  on_paste_url: (url: string) => void
  is_recording: boolean
  on_recording_started: () => void
  on_recording_finished: () => void
  is_setup_complete: boolean
  tabs_count: number
  active_tab_index: number
  on_tab_change: (index: number) => void
  on_new_tab: () => void
  on_tab_delete: (index: number) => void
  on_tabs_reorder: (new_order: number[]) => void
  missing_web_configuration?: boolean
  voice_input_push_to_talk: boolean
  token_count: number
  bottom_spacer_height?: number
}

export const Main: React.FC<Props> = (props) => {
  const [all_web_configurations, set_all_web_configurations] =
    useState<WebConfiguration[]>()
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
  const [ask_about_files_history, set_ask_about_files_history] =
    useState<string[]>()
  const [edit_files_history, set_edit_files_history] = useState<string[]>()
  const [edit_format, set_edit_format] = useState<EditFormat>()
  const [caret_position_to_set, set_caret_position_to_set] = useState<
    number | undefined
  >()

  useEffect(() => {
    const handle_message = async (event: MessageEvent) => {
      const message = event.data as BackendMessage
      switch (message.command) {
        case 'WEB_CONFIGURATIONS':
          set_all_web_configurations(
            (message as WebConfigurationsMessage).web_configurations
          )
          set_selected_web_configuration_name_by_mode(
            (message as WebConfigurationsMessage)
              .selected_web_configuration_name_by_mode
          )
          set_selected_api_configuration_id_by_prompt_type(
            (message as WebConfigurationsMessage)
              .selected_api_configuration_id_by_prompt_type
          )
          break
        case 'API_CONFIGURATIONS':
          set_all_api_configurations(
            (message as ApiConfigurationsMessage).configurations
          )
          break
        case 'CHAT_HISTORY':
          set_ask_about_files_history(message.ask_about_files || [])
          set_edit_files_history(message.edit_files || [])
          break
        case 'INSTRUCTIONS':
          if (
            message.caret_position !== undefined &&
            message.caret_position >= 0
          )
            set_caret_position_to_set(message.caret_position)
          break
        case 'EDIT_FORMAT':
          set_edit_format(message.edit_format)
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

    if (current_prompt_type == 'ask-about-files') {
      history = ask_about_files_history
      set_history = set_ask_about_files_history
    } else if (current_prompt_type == 'edit-files') {
      history = edit_files_history
      set_history = set_edit_files_history
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
  }) => {
    post_message(props.vscode, {
      command: 'AUTOFILL',
      web_configuration_name: params.web_configuration_name,
      show_quick_pick: params.show_quick_pick
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

  const handle_web_configurations_reorder = (
    reordered_web_configurations: WebConfiguration[]
  ) => {
    if (all_web_configurations) {
      set_all_web_configurations(reordered_web_configurations)
    }

    post_message(props.vscode, {
      command: 'REORDER_WEB_CONFIGURATIONS',
      web_configurations: reordered_web_configurations.map(
        (web_configuration) => ({
          name: web_configuration.name,
          chatbot: web_configuration.chatbot,
          model: web_configuration.model,
          reasoning_effort: web_configuration.reasoning_effort,
          system_instructions: web_configuration.system_instructions,
          options: web_configuration.options,
          port: web_configuration.port,
          new_url: web_configuration.new_url,
          is_pinned: web_configuration.is_pinned
        })
      )
    })
  }

  const handle_create_api_configuration = (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => {
    post_message(props.vscode, {
      command: 'CREATE_API_CONFIGURATION',
      api_feature: props.api_prompt_type as any,
      insertion_index: params?.insertion_index,
      exact_insertion: params?.exact_insertion
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
    const config = all_api_configurations?.find((c) => c.id == id)
    if (config) props.on_api_configuration_edit(config)
  }

  const handle_delete_api_configuration = (id: string) => {
    post_message(props.vscode, {
      command: 'DELETE_API_CONFIGURATION',
      api_configuration_id: id
    })
  }

  const handle_toggle_pinned_api_configuration = (id: string) => {
    post_message(props.vscode, {
      command: 'TOGGLE_PINNED_API_CONFIGURATION',
      api_configuration_id: id
    })
  }

  const handle_create_web_configuration = (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => {
    post_message(props.vscode, {
      command: 'CREATE_WEB_CONFIGURATION',
      reference_index: params?.insertion_index,
      exact_insertion: params?.exact_insertion
    })
  }

  const handle_web_configuration_edit = (name: string) => {
    const web_configuration = all_web_configurations?.find(
      (config) => config.name == name
    )
    if (web_configuration) props.on_web_configuration_edit(web_configuration)
  }

  const handle_delete_web_configuration = (name: string) => {
    post_message(props.vscode, {
      command: 'DELETE_WEB_CONFIGURATION',
      name
    })
  }

  const handle_edit_format_change = (format?: EditFormat) => {
    if (format) {
      post_message(props.vscode, {
        command: 'SAVE_EDIT_FORMAT',
        edit_format: format
      })
    } else {
      post_message(props.vscode, {
        command: 'SELECT_EDIT_FORMAT'
      })
    }
  }

  const handle_caret_position_change = (caret_position: number) => {
    post_message(props.vscode, {
      command: 'CARET_POSITION_CHANGED',
      caret_position
    })
  }

  const get_current_instructions = () => {
    if (current_prompt_type == 'ask-about-files') return props.ask_instructions
    if (current_prompt_type == 'edit-files') return props.edit_instructions
    return ''
  }

  const handle_make_api_call = (
    use_quick_pick: boolean
  ) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'MAKE_API_CALL',
      prompt_type: current_prompt_type as ApiPromptType,
      use_quick_pick
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_at_sign_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_AT_SIGN_QUICK_PICK'
    })
  }

  const handle_hash_sign_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_HASH_SIGN_QUICK_PICK'
    })
  }

  const handle_slash_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_TEMPLATE_QUICK_PICK'
    })
  }

  const handle_api_configuration_click = (id: string) => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'MAKE_API_CALL',
      prompt_type: props.api_prompt_type,
      use_quick_pick: false,
      api_configuration_id: id
    })

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
    current_prompt_type == 'ask-about-files'
      ? props.ask_instructions
      : current_prompt_type == 'edit-files'
        ? props.edit_instructions
        : ''

  const set_instructions = (value: string) => {
    props.set_instructions(value, current_prompt_type)
  }

  let current_history: string[] | undefined
  if (current_prompt_type == 'ask-about-files') {
    current_history = ask_about_files_history
  } else if (current_prompt_type == 'edit-files') {
    current_history = edit_files_history
  }

  if (
    all_web_configurations === undefined ||
    all_api_configurations === undefined ||
    ask_about_files_history === undefined ||
    edit_files_history === undefined ||
    instructions === undefined ||
    edit_format === undefined
  ) {
    return <></>
  }

  const selected_web_configuration_name =
    selected_web_configuration_name_by_mode?.[props.web_prompt_type]

  const api_configurations =
    props.mode == MODE.API && all_api_configurations
      ? all_api_configurations
      : []

  return (
    <MainView
      scroll_reset_key={props.scroll_reset_key}
      on_show_home={props.on_show_home}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      api_configurations={api_configurations}
      on_api_configuration_click={handle_api_configuration_click}
      on_api_configurations_reorder={handle_api_configurations_reorder}
      on_toggle_pinned_api_configuration={
        handle_toggle_pinned_api_configuration
      }
      on_edit_api_configuration={handle_edit_api_configuration}
      on_delete_api_configuration={handle_delete_api_configuration}
      on_create_api_configuration={handle_create_api_configuration}
      on_at_sign_click={handle_at_sign_click}
      on_hash_sign_click={handle_hash_sign_click}
      on_slash_click={handle_slash_click}
      is_connected={props.is_connected}
      web_configurations={all_web_configurations || []}
      on_create_web_configuration={handle_create_web_configuration}
      currently_open_file_path={props.currently_open_file_path}
      on_quick_action_click={handle_quick_action_click}
      current_selection={props.current_selection}
      chat_history={current_history || []}
      token_count={props.token_count}
      web_prompt_type={props.web_prompt_type}
      api_prompt_type={props.api_prompt_type}
      on_web_prompt_type_change={props.on_web_prompt_type_change}
      on_api_prompt_type_change={props.on_api_prompt_type_change}
      edit_format={edit_format}
      on_edit_format_change={handle_edit_format_change}
      on_web_configurations_reorder={handle_web_configurations_reorder}
      on_web_configuration_edit={handle_web_configuration_edit}
      on_delete_web_configuration={handle_delete_web_configuration}
      on_toggle_web_configuration_pinned={
        handle_toggle_web_configuration_pinned
      }
      selected_web_configuration_name={selected_web_configuration_name}
      selected_api_configuration_id={
        selected_api_configuration_id_by_prompt_type?.[props.api_prompt_type]
      }
      instructions={instructions}
      set_instructions={set_instructions}
      on_caret_position_change={handle_caret_position_change}
      mode={props.mode}
      on_mode_change={props.on_mode_change}
      on_make_api_call={handle_make_api_call}
      caret_position_to_set={caret_position_to_set}
      on_caret_position_set={() => set_caret_position_to_set(undefined)}
      chat_input_focus_and_select_key={props.chat_input_focus_and_select_key}
      chat_input_focus_key={props.chat_input_focus_key}
      response_history={props.response_history}
      on_response_history_item_click={props.on_response_history_item_click}
      selected_history_item_created_at={props.selected_history_item_created_at}
      on_selected_history_item_change={props.on_selected_history_item_change}
      on_response_history_item_remove={props.on_response_history_item_remove}
      selected_files={props.selected_files}
      send_with_shift_enter={props.send_with_shift_enter}
      on_go_to_file={handle_go_to_file}
      on_pasted_lines_click={props.on_pasted_lines_click}
      currently_open_file_text={props.currently_open_file_text}
      are_keyboard_shortcuts_disabled={props.are_keyboard_shortcuts_disabled}
      on_open_url={props.on_open_url}
      on_open_website={props.on_open_website}
      on_paste_image={props.on_paste_image}
      on_open_image={props.on_open_image}
      on_paste_long_text={props.on_paste_long_text}
      on_open_pasted_text={props.on_open_pasted_text}
      on_paste_url={props.on_paste_url}
      is_recording={props.is_recording}
      on_recording_started={props.on_recording_started}
      on_recording_finished={props.on_recording_finished}
      is_setup_complete={props.is_setup_complete}
      tabs_count={props.tabs_count}
      active_tab_index={props.active_tab_index}
      on_tab_change={props.on_tab_change}
      on_new_tab={props.on_new_tab}
      on_tab_delete={props.on_tab_delete}
      on_tabs_reorder={props.on_tabs_reorder}
      voice_input_push_to_talk={props.voice_input_push_to_talk}
      bottom_spacer_height={props.bottom_spacer_height}
    />
  )
}
