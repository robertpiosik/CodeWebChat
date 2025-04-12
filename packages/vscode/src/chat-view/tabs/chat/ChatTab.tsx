import { useEffect, useState } from 'react'
import { Main } from './Main'
import { Presets as UiPresets } from '@ui/components/editor/Presets'
import {
  WebviewMessage,
  ExtensionMessage,
  ConnectionStatusMessage,
  PresetsMessage,
  SelectedPresetsMessage,
  PresetsSelectedFromPickerMessage,
  ExpandedPresetsMessage,
  FimModeMessage,
  EditorStateChangedMessage,
  EditorSelectionChangedMessage,
  ChatHistoryMessage,
  FimChatHistoryMessage,
  TokenCountMessage,
  SelectionTextMessage,
  ActiveFileInfoMessage
} from '../../types/messages'

const vscode = acquireVsCodeApi()

type Props = {
  is_visible: boolean
}

export const ChatTab: React.FC<Props> = (props) => {
  const [is_connected, set_is_connected] = useState<boolean>()
  const [presets, set_presets] = useState<UiPresets.Preset[]>()
  const [selected_presets, set_selected_presets] = useState<string[]>([])
  const [expanded_presets, set_expanded_presets] = useState<number[]>([])
  const [is_fim_mode, set_is_fim_mode] = useState<boolean>(false)
  const [has_active_editor, set_has_active_editor] = useState<boolean>()
  const [has_active_selection, set_has_active_selection] = useState<boolean>()
  const [chat_history, set_chat_history] = useState<string[]>()
  const [chat_history_fim_mode, set_chat_history_fim_mode] =
    useState<string[]>()
  const [token_count, set_token_count] = useState<number>(0)
  const [selection_text, set_selection_text] = useState<string>('')
  const [active_file_length, set_active_file_length] = useState<number>(0)

  useEffect(() => {
    const initial_messages = [
      { command: 'GET_CONNECTION_STATUS' },
      { command: 'GET_PRESETS' },
      { command: 'GET_SELECTED_PRESETS' },
      { command: 'GET_EXPANDED_PRESETS' },
      { command: 'GET_FIM_MODE' },
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_CHAT_HISTORY' },
      { command: 'GET_FIM_CHAT_HISTORY' },
      { command: 'GET_CURRENT_TOKEN_COUNT' }
    ] as WebviewMessage[]

    initial_messages.forEach((message) => vscode.postMessage(message))

    const handle_message = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage
      switch (message.command) {
        case 'CONNECTION_STATUS':
          set_is_connected((message as ConnectionStatusMessage).connected)
          break
        case 'PRESETS':
          set_presets((message as PresetsMessage).presets)
          break
        case 'SELECTED_PRESETS':
          set_selected_presets((message as SelectedPresetsMessage).names)
          break
        case 'PRESETS_SELECTED_FROM_PICKER':
          set_selected_presets(
            (message as PresetsSelectedFromPickerMessage).names
          )
          break
        case 'EXPANDED_PRESETS':
          set_expanded_presets((message as ExpandedPresetsMessage).indices)
          break
        case 'FIM_MODE':
          set_is_fim_mode((message as FimModeMessage).enabled)
          break
        case 'EDITOR_STATE_CHANGED':
          set_has_active_editor(
            (message as EditorStateChangedMessage).hasActiveEditor
          )
          if (
            !(message as EditorStateChangedMessage).hasActiveEditor &&
            is_fim_mode
          ) {
            set_is_fim_mode(false)
            vscode.postMessage({
              command: 'SAVE_FIM_MODE',
              enabled: false
            } as WebviewMessage)
          }
          break
        case 'EDITOR_SELECTION_CHANGED':
          set_has_active_selection(
            (message as EditorSelectionChangedMessage).hasSelection
          )
          break
        case 'CHAT_HISTORY':
          set_chat_history((message as ChatHistoryMessage).messages || [])
          break
        case 'FIM_CHAT_HISTORY':
          set_chat_history_fim_mode(
            (message as FimChatHistoryMessage).messages || []
          )
          break
        case 'TOKEN_COUNT_UPDATED':
          set_token_count((message as TokenCountMessage).tokenCount)
          break
        case 'SELECTION_TEXT_UPDATED':
          set_selection_text((message as SelectionTextMessage).text)
          break
        case 'ACTIVE_FILE_INFO_UPDATED':
          set_active_file_length((message as ActiveFileInfoMessage).fileLength)
          break
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [is_fim_mode])

  const handle_initialize_chats = (params: {
    instruction: string
    preset_names: string[]
  }) => {
    vscode.postMessage({
      command: 'SEND_PROMPT',
      instruction: params.instruction,
      preset_names: params.preset_names
    } as WebviewMessage)

    // Update the appropriate chat history based on mode
    if (is_fim_mode) {
      // Check if this instruction is already at the top of history
      const is_duplicate =
        chat_history_fim_mode &&
        chat_history_fim_mode.length > 0 &&
        chat_history_fim_mode[0] == params.instruction

      if (!is_duplicate) {
        const new_history = [
          params.instruction,
          ...chat_history_fim_mode!
        ].slice(0, 100)
        set_chat_history_fim_mode(new_history)

        // Save to workspace state
        vscode.postMessage({
          command: 'SAVE_CHAT_HISTORY',
          messages: new_history,
          is_fim_mode: true
        } as WebviewMessage)
      }
    } else {
      // Check if this instruction is already at the top of history
      const is_duplicate =
        chat_history &&
        chat_history.length > 0 &&
        chat_history[0] == params.instruction

      if (!is_duplicate) {
        const new_history = [params.instruction, ...chat_history!].slice(0, 100)
        set_chat_history(new_history)

        // Save to workspace state
        vscode.postMessage({
          command: 'SAVE_CHAT_HISTORY',
          messages: new_history,
          is_fim_mode: false
        } as WebviewMessage)
      }
    }
  }

  const handle_show_preset_picker = (
    instruction: string
  ): Promise<string[]> => {
    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        const message = event.data as ExtensionMessage
        if (message.command === 'PRESETS_SELECTED_FROM_PICKER') {
          window.removeEventListener('message', messageHandler)
          resolve((message as PresetsSelectedFromPickerMessage).names)
        }
      }
      window.addEventListener('message', messageHandler)

      vscode.postMessage({
        command: 'SHOW_PRESET_PICKER',
        instruction
      } as WebviewMessage)
    })
  }

  const handle_copy_to_clipboard = (instruction: string) => {
    vscode.postMessage({
      command: 'COPY_PROMPT',
      instruction
    } as WebviewMessage)
  }

  const handle_presets_selection_change = (selected_names: string[]) => {
    vscode.postMessage({
      command: 'SAVE_SELECTED_PRESETS',
      names: selected_names
    } as WebviewMessage)
    set_selected_presets(selected_names)
  }

  const handle_expanded_presets_change = (expanded_indices: number[]) => {
    vscode.postMessage({
      command: 'SAVE_EXPANDED_PRESETS',
      indices: expanded_indices
    } as WebviewMessage)
    set_expanded_presets(expanded_indices)
  }

  const handle_open_settings = () => {
    vscode.postMessage({
      command: 'OPEN_SETTINGS'
    } as WebviewMessage)
  }

  const handle_fim_mode_click = () => {
    vscode.postMessage({
      command: 'SAVE_FIM_MODE',
      enabled: !is_fim_mode
    } as WebviewMessage)
    set_is_fim_mode(!is_fim_mode)
  }

  const handle_presets_reorder = (reordered_presets: UiPresets.Preset[]) => {
    // Update local state
    set_presets(reordered_presets)

    // Send message to extension to save the new order
    vscode.postMessage({
      command: 'SAVE_PRESETS_ORDER',
      presets: reordered_presets.map((preset) => ({
        name: preset.name,
        chatbot: String(preset.chatbot),
        prompt_prefix: preset.prompt_prefix,
        prompt_suffix: preset.prompt_suffix,
        model: preset.model,
        temperature: preset.temperature,
        system_instructions: preset.system_instructions,
        options: preset.options,
        port: preset.port
      }))
    } as WebviewMessage)
  }

  if (
    is_connected === undefined ||
    presets === undefined ||
    is_fim_mode === undefined ||
    has_active_editor === undefined ||
    has_active_selection === undefined ||
    chat_history === undefined ||
    chat_history_fim_mode === undefined
  ) {
    return null
  }

  return (
    <Main
      is_visible={props.is_visible}
      initialize_chats={handle_initialize_chats}
      show_preset_picker={handle_show_preset_picker}
      copy_to_clipboard={handle_copy_to_clipboard}
      is_connected={is_connected}
      presets={presets}
      selected_presets={selected_presets}
      expanded_presets={expanded_presets}
      on_selected_presets_change={handle_presets_selection_change}
      on_expanded_presets_change={handle_expanded_presets_change}
      open_settings={handle_open_settings}
      has_active_editor={has_active_editor}
      is_fim_mode={is_fim_mode && has_active_editor}
      on_fim_mode_click={handle_fim_mode_click}
      has_active_selection={has_active_selection}
      chat_history={chat_history}
      chat_history_fim_mode={chat_history_fim_mode}
      token_count={token_count}
      selection_text={selection_text}
      active_file_length={active_file_length}
      on_presets_reorder={handle_presets_reorder}
    />
  )
}
