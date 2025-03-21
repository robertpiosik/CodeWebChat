import ReactDOM from 'react-dom/client'
import { useEffect, useState } from 'react'
import { Main } from './Main'
import { Presets as UiPresets } from '@ui/components/Presets'
import {
  WebviewMessage,
  ExtensionMessage,
  InitialPromptMessage,
  InitialFimPromptMessage,
  ConnectionStatusMessage,
  PresetsMessage,
  SelectedPresetsMessage,
  PresetsSelectedFromPickerMessage,
  ExpandedPresetsMessage,
  FimModeMessage,
  EditorStateChangedMessage,
  EditorSelectionChangedMessage,
  ChatHistoryMessage,
  FimChatHistoryMessage
} from './types/messages'

const vscode = acquireVsCodeApi()

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/styles.css'

function App() {
  const [normal_mode_instruction, set_normal_mode_instruction] =
    useState<string>()
  const [fim_mode_instruction, set_fim_mode_instruction] = useState<string>()
  const [is_connected, set_is_connected] = useState<boolean>()
  const [presets, set_presets] = useState<UiPresets.Preset[]>()
  const [selected_presets, set_selected_presets] = useState<string[]>([])
  const [expanded_presets, set_expanded_presets] = useState<number[]>([])
  const [is_fim_mode, set_is_fim_mode] = useState<boolean>()
  const [has_active_editor, set_has_active_editor] = useState<boolean>()
  const [has_active_selection, set_has_active_selection] = useState<boolean>()
  const [chat_history, set_chat_history] = useState<string[]>()
  const [chat_history_fim_mode, set_chat_history_fim_mode] =
    useState<string[]>()

  useEffect(() => {
    vscode.postMessage({ command: 'GET_LAST_PROMPT' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_LAST_FIM_PROMPT' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_CONNECTION_STATUS' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_PRESETS' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_SELECTED_PRESETS' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_EXPANDED_PRESETS' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_FIM_MODE' } as WebviewMessage)
    vscode.postMessage({ command: 'REQUEST_EDITOR_STATE' } as WebviewMessage)
    vscode.postMessage({ command: 'REQUEST_EDITOR_SELECTION_STATE' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_CHAT_HISTORY' } as WebviewMessage)
    vscode.postMessage({ command: 'GET_FIM_CHAT_HISTORY' } as WebviewMessage)

    const handle_message = (event: MessageEvent) => {
      const message = event.data as ExtensionMessage
      switch (message.command) {
        case 'INITIAL_PROMPT':
          set_normal_mode_instruction(
            (message as InitialPromptMessage).instruction
          )
          break
        case 'INITIAL_FIM_PROMPT':
          set_fim_mode_instruction(
            (message as InitialFimPromptMessage).instruction
          )
          break
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
      const new_history = [params.instruction, ...chat_history_fim_mode!].slice(
        0,
        100
      )
      set_chat_history_fim_mode(new_history)

      // Save to workspace state
      vscode.postMessage({
        command: 'SAVE_CHAT_HISTORY',
        messages: new_history,
        is_fim_mode: true
      } as WebviewMessage)
    } else {
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

  const handle_instruction_change = (instruction: string) => {
    if (is_fim_mode) {
      vscode.postMessage({
        command: 'SAVE_FIM_INSTRUCTION',
        instruction
      } as WebviewMessage)
      set_fim_mode_instruction(instruction)
    } else {
      vscode.postMessage({
        command: 'SAVE_CHAT_INSTRUCTION',
        instruction
      } as WebviewMessage)
      set_normal_mode_instruction(instruction)
    }
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

  if (
    normal_mode_instruction === undefined ||
    fim_mode_instruction === undefined ||
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
      initial_normal_instruction={normal_mode_instruction}
      initial_fim_instruction={fim_mode_instruction}
      initialize_chats={handle_initialize_chats}
      show_preset_picker={handle_show_preset_picker}
      copy_to_clipboard={handle_copy_to_clipboard}
      on_instruction_change={handle_instruction_change}
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
    />
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)