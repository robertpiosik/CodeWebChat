import styles from './MainView.module.scss'
import { Configurations as UiConfigurations } from '@ui/components/editor/panel/Configurations'
import { Presets as UiPresets } from '@ui/components/editor/panel/Presets'
import { PromptField as UiPromptField } from '@ui/components/editor/panel/PromptField'
import { Separator as UiSeparator } from '@ui/components/editor/panel/Separator'
import { Preset } from '@shared/types/preset'
import { Responses as UiResponses } from '@ui/components/editor/panel/Responses'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { EditFormat } from '@shared/types/edit-format'
import { MODE, Mode } from '@/views/panel/types/home-view-type'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { BrowserExtensionMessage as UiBrowserExtensionMessage } from '@ui/components/editor/panel/BrowserExtensionMessage'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { use_last_choice_button_title } from './hooks/use-last-choice-button-title'
import { ContextUtilisation as UiContextUtilisation } from '@ui/components/editor/panel/ContextUtilisation'
import { Header } from './components/Header'

type Props = {
  scroll_reset_key: number
  initialize_chats: (params: {
    preset_name?: string
    group_name?: string
    show_quick_pick?: boolean
    without_submission?: boolean
  }) => void
  copy_to_clipboard: (preset_name?: string) => void
  on_show_home: () => void
  on_search_click: () => void
  on_create_preset: () => void
  on_create_group: (options?: {
    add_on_top?: boolean
    instant?: boolean
    create_on_index?: number
  }) => void
  on_at_sign_click: (search_value?: string) => void
  on_hash_sign_click: () => void
  on_curly_braces_click: () => void
  on_quick_action_click: (command: string) => void
  is_connected: boolean
  presets: Preset[]
  configurations: ApiToolConfiguration[]
  on_configuration_click: (id: string) => void
  on_configurations_reorder: (
    reordered_configurations: UiConfigurations.Configuration[]
  ) => void
  on_toggle_pinned_configuration: (id: string) => void
  on_manage_configurations: () => void
  has_active_editor: boolean
  has_active_selection: boolean
  chat_history: string[]
  token_count: number
  context_size_warning_threshold: number
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  chat_edit_format: EditFormat
  api_edit_format: EditFormat
  on_chat_edit_format_change: (edit_format: EditFormat) => void
  on_api_edit_format_change: (edit_format: EditFormat) => void
  edit_format_instructions: Record<EditFormat, string>
  on_presets_reorder: (reordered_presets: Preset[]) => void
  on_preset_edit: (preset_name: string) => void
  on_preset_duplicate: (preset_name: string) => void
  on_preset_delete: (preset_name: string) => void
  on_toggle_selected_preset: (name: string) => void
  on_toggle_preset_pinned: (name: string) => void
  on_toggle_group_collapsed: (name: string) => void
  selected_preset_or_group_name?: string
  selected_configuration_id?: string
  instructions: string
  set_instructions: (value: string) => void
  on_caret_position_change: (caret_position: number) => void
  mode: Mode
  on_mode_change: (value: Mode) => void
  on_edit_context_click: () => void
  on_edit_context_with_quick_pick_click: () => void
  on_code_completion_click: () => void
  on_code_completion_with_quick_pick_click: () => void
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  chat_input_focus_and_select_key: number
  chat_input_focus_key: number
  response_history: ResponseHistoryItem[]
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_remove: (created_at: number) => void
  context_file_paths: string[]
  presets_collapsed: boolean
  on_presets_collapsed_change: (is_collapsed: boolean) => void
  configurations_collapsed: boolean
  on_configurations_collapsed_change: (is_collapsed: boolean) => void
  on_go_to_file: (file_path: string) => void
}

export const MainView: React.FC<Props> = (props) => {
  const is_in_code_completions_prompt_type =
    (props.mode == MODE.WEB && props.web_prompt_type == 'code-completions') ||
    (props.mode == MODE.API && props.api_prompt_type == 'code-completions')

  const show_edit_format_selector =
    (props.mode == MODE.WEB && props.web_prompt_type == 'edit-context') ||
    (props.mode == MODE.API && props.api_prompt_type == 'edit-context')

  const handle_input_change = (value: string) => {
    props.set_instructions(value)
  }

  const handle_submit = async () => {
    if (props.mode == MODE.WEB) {
      props.initialize_chats({})
    } else {
      if (is_in_code_completions_prompt_type) {
        props.on_code_completion_click()
      } else {
        props.on_edit_context_click()
      }
    }
  }

  const handle_submit_with_control = async () => {
    if (props.mode == MODE.WEB) {
      props.initialize_chats({ show_quick_pick: true })
    } else {
      if (is_in_code_completions_prompt_type) {
        props.on_code_completion_with_quick_pick_click()
      } else {
        props.on_edit_context_with_quick_pick_click()
      }
    }
  }

  const last_choice_button_title = use_last_choice_button_title({
    mode: props.mode,
    selected_preset_or_group_name: props.selected_preset_or_group_name,
    presets: props.presets,
    selected_configuration_id: props.selected_configuration_id,
    configurations: props.configurations
  })

  return (
    <>
      <Header
        mode={props.mode}
        on_mode_change={props.on_mode_change}
        on_show_home={props.on_show_home}
        web_prompt_type={props.web_prompt_type}
        on_web_prompt_type_change={props.on_web_prompt_type_change}
        api_prompt_type={props.api_prompt_type}
        on_api_prompt_type_change={props.on_api_prompt_type_change}
        on_quick_action_click={props.on_quick_action_click}
      />
      <Scrollable>
        <UiSeparator height={4} />

        {!props.is_connected && props.mode == MODE.WEB && (
          <>
            <div className={styles['browser-extension-message']}>
              <UiBrowserExtensionMessage />
            </div>
          </>
        )}

        {props.response_history.length > 0 && (
          <UiResponses
            response_history={props.response_history}
            on_response_history_item_click={
              props.on_response_history_item_click
            }
            selected_history_item_created_at={
              props.selected_history_item_created_at
            }
            on_selected_history_item_change={
              props.on_selected_history_item_change
            }
            on_response_history_item_remove={
              props.on_response_history_item_remove
            }
          />
        )}

        <div className={styles['chat-input-container']}>
          <UiPromptField
            value={props.instructions}
            chat_history={props.chat_history}
            on_change={handle_input_change}
            on_submit={handle_submit}
            on_submit_with_control={handle_submit_with_control}
            on_copy={props.copy_to_clipboard}
            on_search_click={props.on_search_click}
            on_at_sign_click={props.on_at_sign_click}
            on_hash_sign_click={props.on_hash_sign_click}
            on_curly_braces_click={props.on_curly_braces_click}
            is_web_mode={props.mode == MODE.WEB}
            is_connected={props.is_connected}
            is_in_code_completions_mode={is_in_code_completions_prompt_type}
            has_active_selection={props.has_active_selection}
            has_active_editor={props.has_active_editor}
            on_caret_position_change={props.on_caret_position_change}
            caret_position_to_set={props.caret_position_to_set}
            on_caret_position_set={props.on_caret_position_set}
            focus_and_select_key={props.chat_input_focus_and_select_key}
            focus_key={props.chat_input_focus_key}
            last_choice_button_title={last_choice_button_title}
            show_edit_format_selector={show_edit_format_selector}
            edit_format={
              props.mode == MODE.WEB
                ? props.chat_edit_format
                : props.api_edit_format
            }
            on_edit_format_change={
              props.mode == MODE.WEB
                ? props.on_chat_edit_format_change
                : props.on_api_edit_format_change
            }
            edit_format_instructions={props.edit_format_instructions}
            context_file_paths={props.context_file_paths}
            on_go_to_file={props.on_go_to_file}
          />
          <UiContextUtilisation
            current_context_size={props.token_count}
            context_size_warning_threshold={
              props.context_size_warning_threshold
            }
          />
        </div>

        {props.mode == MODE.WEB && (
          <>
            <UiSeparator height={8} />
            <UiPresets
              web_prompt_type={props.web_prompt_type}
              is_connected={props.is_connected}
              has_instructions={!!props.instructions}
              has_context={props.token_count > 0}
              is_in_code_completions_mode={
                props.web_prompt_type == 'code-completions'
              }
              presets={props.presets}
              on_create_group={props.on_create_group}
              on_create_preset={props.on_create_preset}
              on_preset_click={(preset_name, without_submission) =>
                props.initialize_chats({
                  preset_name,
                  show_quick_pick: false,
                  without_submission
                })
              }
              on_group_click={(group_name, without_submission) =>
                props.initialize_chats({ group_name, without_submission })
              }
              on_preset_copy={props.copy_to_clipboard}
              on_preset_edit={props.on_preset_edit}
              on_presets_reorder={props.on_presets_reorder}
              on_preset_duplicate={props.on_preset_duplicate}
              on_preset_delete={props.on_preset_delete}
              on_toggle_selected_preset={props.on_toggle_selected_preset}
              on_toggle_preset_pinned={props.on_toggle_preset_pinned}
              on_toggle_group_collapsed={props.on_toggle_group_collapsed}
              selected_preset_name={props.selected_preset_or_group_name}
              is_collapsed={props.presets_collapsed}
              on_toggle_collapsed={props.on_presets_collapsed_change}
            />
          </>
        )}

        {props.mode == MODE.API && (
          <>
            <UiSeparator height={8} />
            <UiConfigurations
              api_prompt_type={props.api_prompt_type}
              configurations={props.configurations.map((c) => ({
                ...c,
                provider: c.provider_name,
                cache_enabled: c.instructions_placement == 'below-only'
              }))}
              on_configuration_click={props.on_configuration_click}
              on_reorder={props.on_configurations_reorder}
              on_toggle_pinned={props.on_toggle_pinned_configuration}
              selected_configuration_id={props.selected_configuration_id}
              on_manage_configurations={props.on_manage_configurations}
              is_collapsed={props.configurations_collapsed}
              on_toggle_collapsed={props.on_configurations_collapsed_change}
            />
          </>
        )}
      </Scrollable>
    </>
  )
}
