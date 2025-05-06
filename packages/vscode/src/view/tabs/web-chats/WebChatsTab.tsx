import { useEffect, useState } from 'react'
import { Main } from './Main'
import {
  WebviewMessage,
  ExtensionMessage,
  PresetsMessage
} from '../../types/messages'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'

type Props = {
  vscode: any
  is_visible: boolean
  on_preset_edit: (preset: Preset) => void
  normal_instructions: string
  set_normal_instructions: (value: string) => void
  code_completion_suggestions: string
  set_code_completion_suggestions: (value: string) => void
}

export const WebChatsTab: React.FC<Props> = (props) => {
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
  const [active_file_length, set_active_file_length] = useState<number>(0)
  const [is_in_code_completions_mode, set_is_in_code_completions_mode] =
    useState<boolean>()
  const [edit_format, set_edit_format] = useState<EditFormat>()
  const [edit_format_selector_visibility, set_edit_format_selector_visibility] =
    useState<'visible' | 'hidden'>('visible')

  useEffect(() => {
    const initial_messages: WebviewMessage[] = [
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'GET_PRESETS' },
      { command: 'GET_SELECTED_PRESETS' },
      { command: 'GET_SELECTED_CODE_COMPLETION_PRESETS' },
      { command: 'GET_CODE_COMPLETIONS_MODE' },
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_HISTORY' },
      { command: 'GET_CODE_COMPLETIONS_HISTORY' },
      { command: 'GET_CURRENT_TOKEN_COUNT' },
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_CODE_COMPLETION_SUGGESTIONS' },
      { command: 'GET_EDIT_FORMAT' },
      { command: 'GET_EDIT_FORMAT_SELECTOR_VISIBILITY' }
    ]

    initial_messages.forEach((message) => props.vscode.postMessage(message))

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
        case 'CODE_COMPLETIONS_MODE':
          set_is_in_code_completions_mode(message.enabled)
          break
        case 'EDITOR_STATE_CHANGED':
          set_has_active_editor(message.has_active_editor)
          if (!message.has_active_editor) {
            set_is_in_code_completions_mode(false)
            props.vscode.postMessage({
              command: 'SAVE_CODE_COMPLETIONS_MODE',
              enabled: false
            } as WebviewMessage)
          }
          break
        case 'EDITOR_SELECTION_CHANGED':
          set_has_active_selection(message.hasSelection)
          break
        case 'CHAT_HISTORY':
          set_chat_history(message.messages || [])
          break
        case 'FIM_CHAT_HISTORY':
          set_chat_history_fim_mode(message.messages || [])
          break
        case 'TOKEN_COUNT_UPDATED':
          set_token_count(message.tokenCount)
          break
        case 'SELECTION_TEXT_UPDATED':
          set_selection_text(message.text)
          break
        case 'ACTIVE_FILE_INFO_UPDATED':
          set_active_file_length(message.fileLength)
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
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

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

  const handle_copy_to_clipboard = (instruction: string) => {
    props.vscode.postMessage({
      command: 'COPY_PROMPT',
      instruction
    } as WebviewMessage)
  }

  const handle_code_completions_mode_click = () => {
    props.vscode.postMessage({
      command: 'SAVE_CODE_COMPLETIONS_MODE',
      enabled: !is_in_code_completions_mode
    } as WebviewMessage)
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
    edit_format_selector_visibility === undefined
  ) {
    return null
  }

  return (
    <Main
      is_visible={props.is_visible}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      is_connected={is_connected}
      presets={presets}
      selected_presets={selected_presets}
      selected_code_completion_presets={selected_code_completion_presets}
      on_create_preset={handle_create_preset}
      has_active_editor={has_active_editor}
      is_in_code_completions_mode={is_in_code_completions_mode}
      on_code_completions_mode_click={handle_code_completions_mode_click}
      has_active_selection={has_active_selection}
      chat_history={chat_history}
      chat_history_fim_mode={chat_history_fim_mode}
      token_count={token_count}
      selection_text={selection_text}
      active_file_length={active_file_length}
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
    />
  )
}
