import { useEffect, useState } from 'react'
import { HomeView } from './HomeView'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { HOME_VIEW_TYPES, HomeViewType } from '@/view/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import {
  ExtensionMessage,
  PresetsMessage,
  WebviewMessage
} from '@/view/types/messages'

type Props = {
  vscode: any
  on_preset_edit: (preset: Preset) => void
  on_show_intro: () => void
  ask_instructions: string
  edit_instructions: string
  no_context_instructions: string
  code_completions_instructions: string
  set_instructions: (
    value: string,
    mode: 'ask' | 'edit' | 'no-context' | 'code-completions'
  ) => void
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
  const [ask_history, set_ask_history] = useState<string[]>()
  const [edit_history, set_edit_history] = useState<string[]>()
  const [no_context_history, set_no_context_history] = useState<string[]>()
  const [code_completions_history, set_code_completions_history] =
    useState<string[]>()
  const [token_count, set_token_count] = useState<number>(0)
  const [selection_text, set_selection_text] = useState<string>('')
  const [home_view_type, set_home_view_type] = useState<HomeViewType>(
    HOME_VIEW_TYPES.WEB
  )
  const [web_mode, set_web_mode] = useState<WebMode>()
  const [api_mode, set_api_mode] = useState<ApiMode>()
  const [chat_edit_format, set_chat_edit_format] = useState<EditFormat>()
  const [api_edit_format, set_api_edit_format] = useState<EditFormat>()

  const is_in_code_completions_mode =
    (home_view_type == HOME_VIEW_TYPES.WEB && web_mode == 'code-completions') ||
    (home_view_type == HOME_VIEW_TYPES.API && api_mode == 'code-completions')

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
          set_ask_history(message.ask || [])
          set_edit_history(message.edit || [])
          set_no_context_history(message.no_context || [])
          set_code_completions_history(message.code_completions || [])
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
          if (message.ask !== undefined)
            props.set_instructions(message.ask, 'ask')
          if (message.edit !== undefined)
            props.set_instructions(message.edit, 'edit')
          if (message.no_context !== undefined)
            props.set_instructions(message.no_context, 'no-context')
          if (message.code_completions !== undefined)
            props.set_instructions(message.code_completions, 'code-completions')
          break
        case 'EDIT_FORMAT':
          set_chat_edit_format(message.chat_edit_format)
          set_api_edit_format(message.api_edit_format)
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
      { command: 'GET_CURRENT_TOKEN_COUNT' },
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_EDIT_FORMAT' },
      { command: 'GET_HOME_VIEW_TYPE' },
      { command: 'GET_WEB_MODE' },
      { command: 'GET_API_MODE' }
    ]
    initial_messages.forEach((message) => props.vscode.postMessage(message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const current_mode =
    home_view_type == HOME_VIEW_TYPES.WEB ? web_mode : api_mode

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

  const update_chat_history = (instruction: string) => {
    if (!instruction.trim()) {
      return
    }

    if (!current_mode) return

    let history: string[] | undefined
    let set_history: React.Dispatch<React.SetStateAction<string[] | undefined>>

    if (current_mode === 'ask') {
      history = ask_history
      set_history = set_ask_history
    } else if (current_mode === 'edit') {
      history = edit_history
      set_history = set_edit_history
    } else if (current_mode === 'no-context') {
      history = no_context_history
      set_history = set_no_context_history
    } else if (current_mode === 'code-completions') {
      history = code_completions_history
      set_history = set_code_completions_history
    } else {
      return
    }

    const is_duplicate =
      history && history.length > 0 && history[0] === instruction

    if (!is_duplicate) {
      const new_history = [instruction, ...(history || [])].slice(0, 100)
      set_history(new_history)

      props.vscode.postMessage({
        command: 'SAVE_HISTORY',
        messages: new_history,
        mode: current_mode
      } as WebviewMessage)
    }
  }

  const handle_initialize_chats = async (params: {
    prompt: string
    preset_names: string[]
  }) => {
    props.vscode.postMessage({
      command: 'SEND_PROMPT',
      preset_names: params.preset_names
    } as WebviewMessage)

    update_chat_history(params.prompt)
  }

  const handle_copy_to_clipboard = (
    instruction: string,
    preset_name?: string
  ) => {
    props.vscode.postMessage({
      command: 'COPY_PROMPT',
      instruction,
      preset_name
    } as WebviewMessage)

    if (instruction.trim() && !preset_name) {
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
        thinking_budget: preset.thinking_budget,
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

  const handle_chat_edit_format_change = (edit_format: EditFormat) => {
    set_chat_edit_format(edit_format)
    props.vscode.postMessage({
      command: 'SAVE_EDIT_FORMAT',
      target: 'chat',
      edit_format
    } as WebviewMessage)
  }

  const handle_api_edit_format_change = (edit_format: EditFormat) => {
    set_api_edit_format(edit_format)
    props.vscode.postMessage({
      command: 'SAVE_EDIT_FORMAT',
      target: 'api',
      edit_format
    } as WebviewMessage)
  }

  const handle_caret_position_change = (caret_position: number) => {
    props.vscode.postMessage({
      command: 'CARET_POSITION_CHANGED',
      caret_position
    } as WebviewMessage)
  }

  const handle_home_view_type_change = (view_type: HomeViewType) => {
    props.vscode.postMessage({
      command: 'SAVE_HOME_VIEW_TYPE',
      view_type
    } as WebviewMessage)
  }

  const get_current_instructions = () => {
    if (is_in_code_completions_mode) {
      return props.code_completions_instructions
    }
    const mode = home_view_type == HOME_VIEW_TYPES.WEB ? web_mode : api_mode
    if (mode == 'ask') return props.ask_instructions
    if (mode == 'edit') return props.edit_instructions
    if (mode == 'no-context') return props.no_context_instructions
    return ''
  }

  const handle_edit_context_click = () => {
    const instruction = get_current_instructions()

    props.vscode.postMessage({
      command: 'EDIT_CONTEXT',
      use_quick_pick: false
    } as WebviewMessage)

    update_chat_history(instruction)
  }

  const handle_edit_context_with_quick_pick_click = () => {
    const instruction = get_current_instructions()

    props.vscode.postMessage({
      command: 'EDIT_CONTEXT',
      use_quick_pick: true
    } as WebviewMessage)

    update_chat_history(instruction)
  }

  const handle_code_completion_click = () => {
    const instruction = get_current_instructions()

    props.vscode.postMessage({
      command: 'CODE_COMPLETION',
      use_quick_pick: false
    } as WebviewMessage)

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_code_completion_with_quick_pick_click = () => {
    const instruction = get_current_instructions()

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

  const handle_search_click = () => {
    props.vscode.postMessage({
      command: 'SHOW_HISTORY_QUICK_PICK'
    } as WebviewMessage)
  }

  const handle_quick_action_click = (command: string) => {
    props.vscode.postMessage({
      command: 'EXECUTE_COMMAND',
      command_id: command
    } as WebviewMessage)
  }

  const instructions =
    current_mode === 'ask'
      ? props.ask_instructions
      : current_mode === 'edit'
      ? props.edit_instructions
      : current_mode === 'no-context'
      ? props.no_context_instructions
      : current_mode === 'code-completions'
      ? props.code_completions_instructions
      : ''

  const set_instructions = (value: string) => {
    if (
      current_mode === 'ask' ||
      current_mode === 'edit' ||
      current_mode === 'no-context' ||
      current_mode === 'code-completions'
    ) {
      props.set_instructions(value, current_mode)
    }
  }

  let current_history: string[] | undefined
  if (current_mode == 'ask') {
    current_history = ask_history
  } else if (current_mode == 'edit') {
    current_history = edit_history
  } else if (current_mode == 'no-context') {
    current_history = no_context_history
  } else if (current_mode == 'code-completions') {
    current_history = code_completions_history
  }

  if (
    is_connected === undefined ||
    presets === undefined ||
    has_active_editor === undefined ||
    has_active_selection === undefined ||
    ask_history === undefined ||
    edit_history === undefined ||
    no_context_history === undefined ||
    code_completions_history === undefined ||
    is_in_code_completions_mode === undefined ||
    instructions === undefined ||
    chat_edit_format === undefined ||
    api_edit_format === undefined ||
    home_view_type === undefined ||
    web_mode === undefined ||
    api_mode === undefined
  ) {
    return <></>
  }

  return (
    <HomeView
      on_show_intro={props.on_show_intro}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      on_search_click={handle_search_click}
      on_at_sign_click={handle_at_sign_click}
      is_connected={is_connected}
      presets={presets}
      selected_presets={selected_presets}
      selected_code_completion_presets={selected_code_completion_presets}
      on_create_preset={handle_create_preset}
      on_quick_action_click={handle_quick_action_click}
      has_active_editor={has_active_editor}
      has_active_selection={has_active_selection}
      chat_history={current_history || []}
      token_count={token_count}
      selection_text={selection_text}
      web_mode={web_mode}
      api_mode={api_mode}
      on_web_mode_change={handle_web_mode_change}
      on_api_mode_change={handle_api_mode_change}
      chat_edit_format={chat_edit_format}
      api_edit_format={api_edit_format}
      on_chat_edit_format_change={handle_chat_edit_format_change}
      on_api_edit_format_change={handle_api_edit_format_change}
      on_presets_reorder={handle_presets_reorder}
      on_preset_edit={handle_preset_edit}
      on_preset_duplicate={handle_preset_duplicate}
      on_preset_delete={handle_preset_delete}
      on_set_default_presets={handle_set_default_presets}
      instructions={instructions}
      set_instructions={set_instructions}
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
    />
  )
}
