import { useState, useEffect } from 'react'
import styles from './Main.scss'
import { Presets as UiPresets } from '@ui/components/editor/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'

type Props = {
  is_visible: boolean
  initialize_chats: (params: {
    instruction: string
    preset_names: string[]
  }) => void
  show_preset_picker: (instruction: string) => Promise<string[]>
  copy_to_clipboard: (instruction: string) => void
  open_settings: () => void
  is_connected: boolean
  presets: UiPresets.Preset[]
  selected_presets: string[]
  expanded_presets: number[]
  on_selected_presets_change: (selected_names: string[]) => void
  on_expanded_presets_change: (expanded_indices: number[]) => void
  is_fim_mode: boolean
  on_fim_mode_click: () => void
  has_active_editor: boolean
  has_active_selection: boolean
  chat_history: string[]
  chat_history_fim_mode: string[]
  token_count: number
  selection_text?: string
  active_file_length?: number
  on_presets_reorder: (reordered_presets: UiPresets.Preset[]) => void
  on_preset_edit: (preset: UiPresets.Preset) => void
}

export const Main: React.FC<Props> = (props) => {
  const [normal_instruction, set_normal_instruction] = useState('')
  const [fim_instruction, set_fim_instruction] = useState('')
  const [estimated_input_tokens, set_estimated_input_tokens] = useState(0)

  // Current instruction is determined by mode
  const current_instruction = props.is_fim_mode
    ? fim_instruction
    : normal_instruction

  // Calculate input token estimation
  useEffect(() => {
    let estimated_tokens = 0
    // Basic estimation for instruction
    let text = current_instruction

    // If there's @selection in the instruction and we have an active selection
    if (
      text.includes('@selection') &&
      props.has_active_selection &&
      props.selection_text
    ) {
      // Approximate replacement
      text = text.replace(/@selection/g, props.selection_text)
    }

    // Rough estimation of tokens (chars/4) for the instruction
    estimated_tokens = Math.ceil(text.length / 4)

    // Add active file length tokens when in FIM mode
    if (props.is_fim_mode && props.active_file_length) {
      // Estimate tokens for the file content
      const file_tokens = Math.ceil(props.active_file_length / 4)
      estimated_tokens += file_tokens
    }

    set_estimated_input_tokens(estimated_tokens)
  }, [
    current_instruction,
    props.has_active_selection,
    props.selection_text,
    props.is_fim_mode,
    props.active_file_length
  ])

  const handle_input_change = (value: string) => {
    // Update the appropriate instruction based on current mode
    if (props.is_fim_mode) {
      set_fim_instruction(value)
    } else {
      set_normal_instruction(value)
    }
  }

  const handle_submit = async () => {
    if (props.selected_presets.length == 0) {
      const selected_names = await props.show_preset_picker(current_instruction)
      if (selected_names.length > 0) {
        props.on_selected_presets_change(selected_names)
        props.initialize_chats({
          instruction: current_instruction,
          preset_names: selected_names
        })
      }
    } else {
      props.initialize_chats({
        instruction: current_instruction,
        preset_names: props.selected_presets
      })
    }
  }

  const handle_copy = () => {
    props.copy_to_clipboard(current_instruction)
  }

  const handle_preset_copy = (preset_name: string) => {
    // Get the preset by name
    const preset = props.presets.find((p) => p.name == preset_name)

    if (preset) {
      // Apply prefix and suffix if they exist
      let modified_instruction = current_instruction
      if (preset.prompt_prefix) {
        modified_instruction = `${preset.prompt_prefix} ${modified_instruction}`
      }
      if (preset.prompt_suffix) {
        modified_instruction = `${modified_instruction} ${preset.prompt_suffix}`
      }

      props.copy_to_clipboard(modified_instruction)
    }
  }

  const handle_fim_mode_click = () => {
    if (props.has_active_editor) {
      props.on_fim_mode_click()
    }
  }

  // Calculate total token count (base + input estimation)
  const total_token_count = props.token_count + estimated_input_tokens

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <UiSeparator size="small" />
      <UiChatInput
        value={current_instruction}
        chat_history={props.chat_history}
        chat_history_fim_mode={props.chat_history_fim_mode}
        on_change={handle_input_change}
        on_submit={handle_submit}
        on_copy={handle_copy}
        is_connected={props.is_connected}
        token_count={total_token_count}
        submit_disabled_title={
          !props.is_connected
            ? 'WebSocket connection not established. Please install the browser extension.'
            : 'Initialize chats'
        }
        is_fim_mode={props.is_fim_mode}
        on_fim_mode_click={handle_fim_mode_click}
        has_active_editor={props.has_active_editor}
        has_active_selection={props.has_active_selection}
      />
      {!props.is_connected && (
        <>
          <UiSeparator size="large" />
          <div className={styles['browser-extension-message']}>
            <span>
              Get the{' '}
              <a href="https://gemini-coder.netlify.app/docs/installation/web-browser-integration">
                Gemini Coder Connector
              </a>{' '}
              for hands-free chat inititalizations.
            </span>

            <a href="https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
              - Install for Chrome
            </a>

            <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
              - Install for Firefox
            </a>
          </div>
        </>
      )}
      <UiSeparator size="large" />
      <UiPresets
        presets={props.presets}
        disabled={!props.is_connected}
        selected_presets={props.selected_presets}
        expanded_presets={props.expanded_presets}
        on_selected_presets_change={props.on_selected_presets_change}
        on_expanded_presets_change={props.on_expanded_presets_change}
        on_edit_presets={props.open_settings}
        on_preset_click={(name) => {
          props.initialize_chats({
            instruction: current_instruction,
            preset_names: [name]
          })
        }}
        on_preset_copy={handle_preset_copy}
        on_preset_edit={props.on_preset_edit}
        is_fim_mode={props.is_fim_mode}
        on_presets_reorder={props.on_presets_reorder}
      />
    </div>
  )
}
