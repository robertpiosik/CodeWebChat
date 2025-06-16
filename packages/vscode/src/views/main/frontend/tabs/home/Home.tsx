import { useEffect, useState } from 'react'
import { HomeView } from './HomeView'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage
} from '../../../types/messages'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { HOME_VIEW_TYPES, HomeViewType } from '@/views/main/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'

type Props = {
  vscode: any
  is_visible: boolean
  on_preset_edit: (preset: Preset) => void
  normal_instructions: string
  set_normal_instructions: (value: string) => void
  code_completion_suggestions: string
  set_code_completion_suggestions: (value: string) => void
}

export const Home: React.FC<Props> = (props) => {
  const [is_connected, set_is_connected] = useState<boolean>()
  const [presets, set_presets] = useState<Preset[]>()
  const [selected_presets, set_selected_presets] = useState<string[]>([])
  const [
    selected_code_completion_presets,
    set_selected_code_completion_presets
  ] = useState<string[]>([])
  const [has_active_editor, set_has_active_editor] = useState<boolean>()
  const [has_active_selection, set_has_active_selection] = useState<boolean>()
  const [chat_history, set_chat_history] = useState<string[]>()
  const [chat_history_fim_mode, set_chat_history_fim_mode] =
    useState<string[]>()
  const [token_count, set_token_count] = useState<number>(0)
  const [selection_text, set_selection_text] = useState<string>('')
  const [home_view_type, set_home_view_type] = useState<HomeViewType>(
    HOME_VIEW_TYPES.WEB
  )
  const [web_mode, set_web_mode] = useState<WebMode>()
  const [api_mode, set_api_mode] = useState<ApiMode>()
  const [edit_format, set_edit_format] = useState<EditFormat>()
  const [edit_format_selector_visibility, set_edit_format_selector_visibility] =
    useState<'visible' | 'hidden'>('visible')

  const is_in_code_completions_mode =
    (home_view_type == 'Web' && web_mode == 'code-completions') ||
    (home_view_type == 'API' && api_mode == 'code-completions')

  useEffect(() => {
    const handle_message = async (event: MessageEvent) => {
      const message = event.data as ExtensionMessage
      switch (message.command) {
        case 'CONNECTION_STATUS':
          set_is_connected(message.connected)
          break
        case 'PRESETS':
          set_presets((message as PresetsMessage).presets)
          break
        case 'SELECTED_PRESETS':
          set_selected_presets(message.names)
          break
        case 'SELECTED_CODE_COMPLETION_PRESETS':
          set_selected_code_completion_presets(message.names)
          break
        case 'PRESETS_SELECTED_FROM_PICKER':
          set_selected_presets(message.names)
          break
        case 'EDITOR_STATE_CHANGED':
          set_has_active_editor(message.has_active_editor)
          break
        case 'EDITOR_SELECTION_CHANGED':
          set_has_active_selection(message.has_selection)
          break
        case 'CHAT_HISTORY':
          set_chat_history(message.messages || [])
          break
        case 'FIM_CHAT_HISTORY':
          set_chat_history_fim_mode(message.messages || [])
          break
        case 'TOKEN_COUNT_UPDATED':
          set_token_count(message.token_count)
          break
        case 'SELECTION_TEXT_UPDATED':
          set_selection_text(message.text)
          break
        case 'PRESET_CREATED':
          props.on_preset_edit(message.preset)
          break
        case 'INSTRUCTIONS':
          props.set_normal_instructions(message.value || '')
          break
        case 'CODE_COMPLETION_SUGGESTIONS':
          props.set_code_completion_suggestions(message.value || '')
          break
        case 'EDIT_FORMAT':
          set_edit_format(message.edit_format)
          break
        case 'EDIT_FORMAT_SELECTOR_VISIBILITY':
          set_edit_format_selector_visibility(message.visibility)
          break
        case 'HOME_VIEW_TYPE':
          set_home_view_type(message.view_type)
          break
        case 'WEB_MODE':
          set_web_mode(message.mode)
          break
        case 'API_MODE':
          set_api_mode(message.mode)
          break
      }
    }

    window.addEventListener('message', handle_message)

    const initial_messages: WebviewMessage[] = [
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'GET_PRESETS' },
      { command: 'GET_SELECTED_PRESETS' },
      { command: 'GET_SELECTED_CODE_COMPLETION_PRESETS' },
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_HISTORY' },
      { command: 'GET_CODE_COMPLETIONS_HISTORY' },
      { command: 'GET_CURRENT_TOKEN_COUNT' },
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_CODE_COMPLETION_SUGGESTIONS' },
      { command: 'GET_EDIT_FORMAT' },
      { command: 'GET_EDIT_FORMAT_SELECTOR_VISIBILITY' },
      { command: 'GET_HOME_VIEW_TYPE' },
      { command: 'GET_WEB_MODE' },
      { command: 'GET_API_MODE' }
    ]
    initial_messages.forEach((message) => props.vscode.postMessage(message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_web_mode_change = (new_mode: WebMode) => {
    set_web_mode(new_mode)
    props.vscode.postMessage({
      command: 'SAVE_WEB_MODE',
      mode: new_mode
    } as WebviewMessage)
    props.vscode.postMessage({
      command: 'GET_CURRENT_TOKEN_COUNT'
    } as WebviewMessage)
  }

  const handle_api_mode_change = (new_mode: ApiMode) => {
    set_api_mode(new_mode)
    props.vscode.postMessage({
      command: 'SAVE_API_MODE',
      mode: new_mode
    } as WebviewMessage)
    props.vscode.postMessage({
      command: 'GET_CURRENT_TOKEN_COUNT'
    } as WebviewMessage)
  }

  const handle_initialize_chats = async (params: {
    prompt: string
    preset_names: string[]
  }) => {
    props.vscode.postMessage({
      command: 'SEND_PROMPT',
      preset_names: params.preset_names
    } as WebviewMessage)

    // Update the appropriate chat history based on mode
    if (is_in_code_completions_mode) {
      // Check if this instruction is already at the top of history
      const is_duplicate =
        chat_history_fim_mode &&
        chat_history_fim_mode.length > 0 &&
        chat_history_fim_mode[0] == params.prompt

      if (!is_duplicate) {
        const new_history = [
          params.prompt,
          ...(chat_history_fim_mode || [])
        ].slice(0, 100)
        set_chat_history_fim_mode(new_history)

        // Save to workspace state
        props.vscode.postMessage({
          command: 'SAVE_HISTORY',
          messages: new_history,
          is_fim_mode: true // Indicate FIM mode
        } as WebviewMessage)
      }
    } else {
      // Check if this instruction is already at the top of history
      const is_duplicate =
        chat_history &&
        chat_history.length > 0 &&
        chat_history[0] == params.prompt

      if (!is_duplicate) {
        const new_history = [params.prompt, ...(chat_history || [])].slice(
          0,
          100
        )
        set_chat_history(new_history)

        // Save to workspace state
        props.vscode.postMessage({
          command: 'SAVE_HISTORY',
          messages: new_history,
          is_fim_mode: false // Indicate normal mode
        } as WebviewMessage)
      }
    }
  }

  const update_chat_history = (instruction: string) => {
    if (is_in_code_completions_mode) {
      const is_duplicate =
        chat_history_fim_mode &&
        chat_history_fim_mode.length > 0 &&
        chat_history_fim_mode[0] == instruction

      if (!is_duplicate) {
        const new_history = [
          instruction,
          ...(chat_history_fim_mode || [])
        ].slice(0, 100)
        set_chat_history_fim_mode(new_history)

        props.vscode.postMessage({
          command: 'SAVE_HISTORY',
          messages: new_history,
          is_fim_mode: true
        } as WebviewMessage)
      }
    } else {
      const is_duplicate =
        chat_history &&
        chat_history.length > 0 &&
        chat_history[0] == instruction

      if (!is_duplicate) {
        const new_history = [instruction, ...(chat_history || [])].slice(0, 100)
        set_chat_history(new_history)

        props.vscode.postMessage({
          command: 'SAVE_HISTORY',
          messages: new_history,
          is_fim_mode: false
        } as WebviewMessage)
      }
    }
  }

  const handle_copy_to_clipboard = (instruction: string) => {
    props.vscode.postMessage({
      command: 'COPY_PROMPT',
      instruction
    } as WebviewMessage)

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_presets_reorder = (reordered_presets: Preset[]) => {
    // Update local state
    set_presets(reordered_presets)

    // Send message to extension to save the new order
    props.vscode.postMessage({
      command: 'SAVE_PRESETS_ORDER',
      presets: reordered_presets.map((preset) => ({
        name: preset.name,
        chatbot: String(preset.chatbot),
        prompt_prefix: preset.prompt_prefix,
        prompt_suffix: preset.prompt_suffix,
        model: preset.model,
        temperature: preset.temperature,
        top_p: preset.top_p,
        system_instructions: preset.system_instructions,
        options: preset.options,
        port: preset.port
      }))
    } as WebviewMessage)
  }

  const handle_create_preset = () => {
    props.vscode.postMessage({
      command: 'CREATE_PRESET'
    } as WebviewMessage)
  }

  const handle_preset_edit = (name: string) => {
    const preset = presets?.find((preset) => preset.name == name)
    if (preset) props.on_preset_edit(preset)
  }

  const handle_preset_duplicate = (name: string) => {
    props.vscode.postMessage({
      command: 'DUPLICATE_PRESET',
      name
    } as WebviewMessage)
  }

  const handle_preset_delete = (name: string) => {
    props.vscode.postMessage({
      command: 'DELETE_PRESET',
      name
    } as WebviewMessage)
  }

  const handle_set_default_presets = () => {
    props.vscode.postMessage({
      command: 'SHOW_PRESET_PICKER'
    } as WebviewMessage)
  }

  const handle_edit_format_change = (edit_format: EditFormat) => {
    set_edit_format(edit_format)
    props.vscode.postMessage({
      command: 'SAVE_EDIT_FORMAT',
      edit_format
    } as WebviewMessage)
  }

  const handle_caret_position_change = (caret_position: number) => {
    props.vscode.postMessage({
      command: 'CARET_POSITION_CHANGED',
      caret_position
    } as WebviewMessage)
  }

  const handle_quick_actions = () => {
    props.vscode.postMessage({
      command: 'SHOW_QUICK_ACTIONS'
    } as WebviewMessage)
  }

  const handle_home_view_type_change = (view_type: HomeViewType) => {
    props.vscode.postMessage({
      command: 'SAVE_HOME_VIEW_TYPE',
      view_type
    } as WebviewMessage)
  }

  const handle_edit_context_click = () => {
    const instruction = is_in_code_completions_mode
      ? props.code_completion_suggestions
      : props.normal_instructions

    props.vscode.postMessage({
      command: 'EDIT_CONTEXT',
      use_quick_pick: false
    } as WebviewMessage)

    update_chat_history(instruction)
  }

  const handle_edit_context_with_quick_pick_click = () => {
    const instruction = is_in_code_completions_mode
      ? props.code_completion_suggestions
      : props.normal_instructions

    props.vscode.postMessage({
      command: 'EDIT_CONTEXT',
      use_quick_pick: true
    } as WebviewMessage)

    update_chat_history(instruction)
  }

  const handle_code_completion_click = () => {
    const instruction = is_in_code_completions_mode
      ? props.code_completion_suggestions
      : props.normal_instructions

    props.vscode.postMessage({
      command: 'CODE_COMPLETION',
      use_quick_pick: false
    } as WebviewMessage)

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_code_completion_with_quick_pick_click = () => {
    const instruction = is_in_code_completions_mode
      ? props.code_completion_suggestions
      : props.normal_instructions

    props.vscode.postMessage({
      command: 'CODE_COMPLETION',
      use_quick_pick: true
    } as WebviewMessage)

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_at_sign_click = () => {
    props.vscode.postMessage({
      command: 'SHOW_AT_SIGN_QUICK_PICK'
    } as WebviewMessage)
  }

  const handle_settings_click = () => {
    props.vscode.postMessage({
      command: 'OPEN_SETTINGS'
    } as WebviewMessage)
  }

  if (
    is_connected === undefined ||
    presets === undefined ||
    has_active_editor === undefined ||
    has_active_selection === undefined ||
    chat_history === undefined ||
    chat_history_fim_mode === undefined ||
    is_in_code_completions_mode === undefined ||
    props.normal_instructions === undefined ||
    props.code_completion_suggestions === undefined ||
    edit_format === undefined ||
    edit_format_selector_visibility === undefined ||
    home_view_type === undefined ||
    web_mode === undefined ||
    api_mode === undefined
  ) {
    return <></>
  }

  return (
    <HomeView
      is_visible={props.is_visible}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      on_at_sign_click={handle_at_sign_click}
      is_connected={is_connected}
      presets={presets}
      selected_presets={selected_presets}
      selected_code_completion_presets={selected_code_completion_presets}
      on_create_preset={handle_create_preset}
      on_quick_actions_click={handle_quick_actions}
      has_active_editor={has_active_editor}
      has_active_selection={has_active_selection}
      chat_history={chat_history}
      chat_history_fim_mode={chat_history_fim_mode}
      token_count={token_count}
      selection_text={selection_text}
      web_mode={web_mode}
      api_mode={api_mode}
      on_web_mode_change={handle_web_mode_change}
      on_api_mode_change={handle_api_mode_change}
      edit_format={edit_format}
      on_edit_format_change={handle_edit_format_change}
      on_presets_reorder={handle_presets_reorder}
      on_preset_edit={handle_preset_edit}
      on_preset_duplicate={handle_preset_duplicate}
      on_preset_delete={handle_preset_delete}
      on_set_default_presets={handle_set_default_presets}
      normal_instructions={props.normal_instructions}
      set_normal_instructions={props.set_normal_instructions}
      code_completion_suggestions={props.code_completion_suggestions}
      set_code_completion_suggestions={props.set_code_completion_suggestions}
      edit_format_selector_visibility={edit_format_selector_visibility}
      on_caret_position_change={handle_caret_position_change}
      home_view_type={home_view_type}
      on_home_view_type_change={handle_home_view_type_change}
      on_edit_context_click={handle_edit_context_click}
      on_edit_context_with_quick_pick_click={
        handle_edit_context_with_quick_pick_click
      }
      on_code_completion_click={handle_code_completion_click}
      on_code_completion_with_quick_pick_click={
        handle_code_completion_with_quick_pick_click
      }
      on_settings_click={handle_settings_click}
    />
  )
}
