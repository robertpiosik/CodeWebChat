import { useState, useEffect } from 'react'
import styles from './Main.module.scss'
import { Presets as UiPresets } from '@ui/components/editor/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { EditFormatSelector as UiEditFormatSelector } from '@ui/components/editor/EditFormatSelector'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { EditFormatSelectorVisibility } from '@/view/types/edit-format-selector-visibility'

type Props = {
  is_visible: boolean
  initialize_chats: (params: { prompt: string; preset_names: string[] }) => void
  copy_to_clipboard: (instruction: string) => void
  on_create_preset: () => void
  is_connected: boolean
  presets: Preset[]
  selected_presets: string[]
  selected_code_completion_presets: string[]
  on_code_completions_mode_click: () => void
  is_in_code_completions_mode: boolean
  has_active_editor: boolean
  has_active_selection: boolean
  chat_history: string[]
  chat_history_fim_mode: string[]
  token_count: number
  selection_text?: string
  active_file_length?: number
  edit_format_selector_visibility: EditFormatSelectorVisibility
  edit_format: EditFormat
  on_edit_format_change: (edit_format: EditFormat) => void
  on_presets_reorder: (reordered_presets: Preset[]) => void
  on_preset_edit: (preset_name: string) => void
  on_preset_duplicate: (preset_name: string) => void
  on_preset_delete: (preset_name: string) => void
  on_set_default_presets: () => void
  normal_instructions: string
  set_normal_instructions: (value: string) => void
  code_completion_suggestions: string
  set_code_completion_suggestions: (value: string) => void
}

export const Main: React.FC<Props> = (props) => {
  const [estimated_input_tokens, set_estimated_input_tokens] = useState(0)

  const current_prompt = props.is_in_code_completions_mode
    ? props.code_completion_suggestions
    : props.normal_instructions

  // Calculate input token estimation
  useEffect(() => {
    let estimated_tokens = 0
    // Basic estimation for instruction
    let text = current_prompt

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
    if (props.is_in_code_completions_mode && props.active_file_length) {
      // Estimate tokens for the file content
      const file_tokens = Math.ceil(props.active_file_length / 4)
      estimated_tokens += file_tokens
    }

    set_estimated_input_tokens(estimated_tokens)
  }, [
    current_prompt,
    props.has_active_selection,
    props.selection_text,
    props.is_in_code_completions_mode,
    props.active_file_length
  ])

  const handle_input_change = (value: string) => {
    // Update the appropriate instruction based on current mode
    if (props.is_in_code_completions_mode) {
      props.set_code_completion_suggestions(value) // Use prop setter
    } else {
      props.set_normal_instructions(value) // Use prop setter
    }
  }

  const handle_submit = async () => {
    props.initialize_chats({
      prompt: current_prompt,
      preset_names: !props.is_in_code_completions_mode
        ? props.selected_presets
        : props.selected_code_completion_presets
    })
  }

  const handle_copy = () => {
    props.copy_to_clipboard(current_prompt)
  }

  const handle_preset_copy = (preset_name: string) => {
    // Get the preset by name
    const preset = props.presets.find((p) => p.name == preset_name)

    if (preset) {
      // Apply prefix and suffix if they exist
      let modified_instruction = current_prompt
      if (preset.prompt_prefix) {
        modified_instruction = `${preset.prompt_prefix} ${modified_instruction}`
      }
      if (preset.prompt_suffix) {
        modified_instruction = `${modified_instruction} ${preset.prompt_suffix}`
      }

      props.copy_to_clipboard(modified_instruction)
    }
  }

  const handle_code_completion_mode_click = () => {
    if (props.has_active_editor) {
      props.on_code_completions_mode_click()
    }
  }

  const total_token_count = props.token_count + estimated_input_tokens

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <div className={styles['chat-input']}>
        <UiChatInput
          value={current_prompt}
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
          is_in_code_completions_mode={props.is_in_code_completions_mode}
          on_code_completions_mode_click={handle_code_completion_mode_click}
          has_active_editor={props.has_active_editor}
          has_active_selection={props.has_active_selection}
        />
      </div>

      {props.edit_format_selector_visibility == 'visible' && (
        <>
          <UiSeparator size="medium" />
          <UiEditFormatSelector
            format={props.edit_format}
            on_change={props.on_edit_format_change}
          />
        </>
      )}

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
        presets={props.presets.map((preset) => {
          return {
            ...preset,
            has_affixes: !!(preset.prompt_prefix || preset.prompt_suffix)
          }
        })}
        disabled={!props.is_connected}
        selected_presets={props.selected_presets}
        selected_code_completion_presets={
          props.selected_code_completion_presets
        }
        on_create_preset={props.on_create_preset}
        on_preset_click={(name) => {
          props.initialize_chats({
            prompt: current_prompt,
            preset_names: [name]
          })
        }}
        on_preset_copy={handle_preset_copy}
        on_preset_edit={props.on_preset_edit}
        is_code_completions_mode={props.is_in_code_completions_mode}
        on_presets_reorder={props.on_presets_reorder}
        on_preset_duplicate={props.on_preset_duplicate}
        on_preset_delete={props.on_preset_delete}
        on_set_default_presets={props.on_set_default_presets}
      />
    </div>
  )
}
