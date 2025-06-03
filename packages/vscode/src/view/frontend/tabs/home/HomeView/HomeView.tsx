import { useState, useEffect, useRef } from 'react'
import styles from './HomeView.module.scss'
import { Presets as UiPresets } from '@ui/components/editor/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { HorizontalSelector as UiHorizontalSelector } from '@ui/components/editor/HorizontalSelector'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { EditFormatSelectorVisibility } from '@/view/types/edit-format-selector-visibility'
import { Switch } from '@ui/components/editor/Switch'
import { HOME_VIEW_TYPES, HomeViewType } from '@/view/types/home-view-type'
import { TextButton as UiTextButton } from '@ui/components/editor/TextButton'

type Props = {
  is_visible: boolean
  initialize_chats: (params: { prompt: string; preset_names: string[] }) => void
  copy_to_clipboard: (instruction: string) => void
  on_create_preset: () => void
  on_apply_copied_chat_response_click: () => void
  is_connected: boolean
  presets: Preset[]
  selected_presets: string[]
  selected_code_completion_presets: string[]
  on_code_completions_mode_click: (is_enabled: boolean) => void
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
  on_caret_position_change: (caret_position: number) => void
  home_view_type: HomeViewType
  on_home_view_type_change: (value: HomeViewType) => void
  on_refactor_click: () => void
  on_refactor_with_quick_pick_click: () => void
  on_code_completion_click: () => void
  on_code_completion_with_quick_pick_click: () => void
}

export const HomeView: React.FC<Props> = (props) => {
  const [estimated_input_tokens, set_estimated_input_tokens] = useState(0)
  const container_ref = useRef<HTMLDivElement>(null)

  const current_prompt = props.is_in_code_completions_mode
    ? props.code_completion_suggestions
    : props.normal_instructions

  useEffect(() => {
    let estimated_tokens = 0
    let text = current_prompt

    if (
      text.includes('@selection') &&
      props.has_active_selection &&
      props.selection_text
    ) {
      text = text.replace(/@selection/g, props.selection_text)
    }

    estimated_tokens = Math.ceil(text.length / 4)

    if (props.is_in_code_completions_mode && props.active_file_length) {
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
      props.set_code_completion_suggestions(value)
    } else {
      props.set_normal_instructions(value)
    }
  }

  const handle_submit = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({
        prompt: current_prompt,
        preset_names: !props.is_in_code_completions_mode
          ? props.selected_presets
          : props.selected_code_completion_presets
      })
    } else {
      if (props.is_in_code_completions_mode) {
        props.on_code_completion_click()
      } else {
        props.on_refactor_click()
      }
    }
  }

  const handle_submit_with_control = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({
        prompt: current_prompt,
        preset_names: []
      })
    } else {
      if (props.is_in_code_completions_mode) {
        props.on_code_completion_with_quick_pick_click()
      } else {
        props.on_refactor_with_quick_pick_click()
      }
    }
  }

  const handle_copy = () => {
    props.copy_to_clipboard(current_prompt)
  }

  const handle_preset_copy = (preset_name: string) => {
    const preset = props.presets.find((p) => p.name == preset_name)

    if (preset) {
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

  const handle_mode_click = (mode: 'general' | 'code-completions') => {
    if (mode == 'code-completions' && !props.is_in_code_completions_mode) {
      props.on_code_completions_mode_click(true)
    } else if (mode == 'general' && props.is_in_code_completions_mode) {
      props.on_code_completions_mode_click(false)
    }
  }

  const total_token_count = props.token_count + estimated_input_tokens

  useEffect(() => {
    container_ref.current!.scrollTop = 0
  }, [props.is_visible])

  return (
    <div
      className={styles.container}
      ref={container_ref}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <div className={styles.top}>
        <Switch
          value={props.home_view_type}
          on_change={props.on_home_view_type_change}
          options={Object.values(HOME_VIEW_TYPES)}
        />
        {props.home_view_type == HOME_VIEW_TYPES.WEB && (
          <div className={styles.top__right}>
            <UiTextButton
              on_click={props.on_apply_copied_chat_response_click}
              title="Integrate changes from the copied chat response with the codebase"
            >
              Apply chat response
            </UiTextButton>
          </div>
        )}
      </div>

      <UiSeparator size="small" />

      <div className={styles['chat-input']}>
        <UiChatInput
          value={current_prompt}
          chat_history={props.chat_history}
          chat_history_fim_mode={props.chat_history_fim_mode}
          on_change={handle_input_change}
          on_submit={handle_submit}
          on_submit_with_control={handle_submit_with_control}
          on_copy={
            props.home_view_type == HOME_VIEW_TYPES.WEB
              ? handle_copy
              : undefined
          }
          is_web_mode={props.home_view_type == HOME_VIEW_TYPES.WEB}
          is_connected={props.is_connected}
          token_count={total_token_count}
          submit_disabled_title={
            !props.is_connected
              ? 'WebSocket connection not established. Please install the browser extension.'
              : 'Type something'
          }
          is_in_code_completions_mode={props.is_in_code_completions_mode}
          has_active_selection={props.has_active_selection}
          has_active_editor={props.has_active_editor}
          on_caret_position_change={props.on_caret_position_change}
          translations={{
            ask_anything: 'Ask anything',
            refactoring_instructions: 'Refactoring instructions',
            optional_suggestions: 'Optional suggestions',
            edit_files: 'Edit files',
            autocomplete: 'Autocomplete',
            initialize: 'Initialize',
            select_preset: 'Select preset',
            select_config: 'Select config',
            code_completions_mode_unavailable_with_text_selection:
              'Unavailable with text selection',
            code_completions_mode_unavailable_without_active_editor:
              'Unavailable without active editor'
          }}
        />
      </div>

      <UiSeparator size="small" />

      <UiHorizontalSelector
        heading="Mode"
        options={[
          {
            value: 'general',
            label:
              props.home_view_type == HOME_VIEW_TYPES.WEB
                ? 'General'
                : 'Refactoring',
            title:
              props.home_view_type == HOME_VIEW_TYPES.WEB
                ? 'Ask anything and integrate chat responses with the codebase'
                : 'Modify files based on natural language instructions'
          },
          {
            value: 'code-completions',
            label: 'Code Completions',
            title: 'Ask for code at cursor position'
          }
        ]}
        selected_value={
          props.is_in_code_completions_mode ? 'code-completions' : 'general'
        }
        on_select={handle_mode_click}
      />

      {props.edit_format_selector_visibility == 'visible' &&
        props.home_view_type == HOME_VIEW_TYPES.WEB && (
          <>
            <UiSeparator size="small" />
            <UiHorizontalSelector
              heading="Edit Format"
              options={[
                {
                  value: 'truncated',
                  label: 'Truncated',
                  title: 'The model will skip unchanged fragments.'
                },
                {
                  value: 'whole',
                  label: 'Whole',
                  title: 'The model will output complete files.'
                },
                {
                  value: 'diff',
                  label: 'Diff',
                  title: 'The model will output diffs.'
                }
              ]}
              selected_value={
                !props.is_in_code_completions_mode
                  ? props.edit_format
                  : undefined
              }
              on_select={props.on_edit_format_change}
              is_disabled={props.is_in_code_completions_mode}
              disabled_state_title="Edit format selection is only available in General mode"
            />
          </>
        )}

      <UiSeparator size="large" />

      {!props.is_connected && (
        <>
          <div className={styles['browser-extension-message']}>
            <span>
              Get the connector browser extension for hands-free chat
              inititalizations.
            </span>
            <a href="https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
              Install for Chrome
            </a>
            <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
              Install for Firefox
            </a>
          </div>

          <UiSeparator size="large" />
        </>
      )}

      {props.home_view_type == HOME_VIEW_TYPES.WEB && (
        <UiPresets
          presets={props.presets.map((preset) => {
            return {
              ...preset,
              has_affixes: !!(preset.prompt_prefix || preset.prompt_suffix)
            }
          })}
          is_disabled={!props.is_connected}
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
      )}
    </div>
  )
}
