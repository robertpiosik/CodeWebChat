import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import styles from './MainView.module.scss'
import { Configurations as UiConfigurations } from '@ui/components/editor/panel/Configurations'
import { Presets as UiPresets } from '@ui/components/editor/panel/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/panel/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/panel/Separator'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import {
  HOME_VIEW_TYPES,
  HomeViewType
} from '@/views/panel/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { BrowserExtensionMessage as UiBrowserExtensionMessage } from '@ui/components/editor/panel/BrowserExtensionMessage'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { use_last_choice_button_title } from './hooks/use-last-choice-button-title'
import { use_cycle_mode } from './hooks/use-cycle-mode'
import { use_re_render_on_interval } from './hooks/use-re-render-on-interval'
import { ContextUtilisation as UiContextUtilisation } from '@ui/components/editor/panel/ContextUtilisation'
import { WEB_MODES, API_MODES } from './modes'
import { Header } from './components/Header'
import cn from 'classnames'
import { FileInPreview } from '@shared/types/file-in-preview'

dayjs.extend(relativeTime)

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
  on_manage_configurations: () => void
  has_active_editor: boolean
  has_active_selection: boolean
  chat_history: string[]
  token_count: number
  context_size_warning_threshold: number
  web_mode: WebMode
  api_mode: ApiMode
  on_web_mode_change: (mode: WebMode) => void
  on_api_mode_change: (mode: ApiMode) => void
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
  on_toggle_group_collapsed: (name: string) => void
  selected_preset_or_group_name?: string
  selected_configuration_id?: string
  instructions: string
  set_instructions: (value: string) => void
  on_caret_position_change: (caret_position: number) => void
  home_view_type: HomeViewType
  on_home_view_type_change: (value: HomeViewType) => void
  on_edit_context_click: () => void
  on_edit_context_with_quick_pick_click: () => void
  on_code_completion_click: () => void
  on_code_completion_with_quick_pick_click: () => void
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  chat_input_focus_and_select_key: number
  chat_input_focus_key: number
  response_history: {
    response: string
    raw_instructions?: string
    created_at: number
    lines_added: number
    lines_removed: number
    files?: FileInPreview[]
  }[]
  on_response_history_item_click: (item: {
    response: string
    raw_instructions?: string
    files?: FileInPreview[]
  }) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
}

export const MainView: React.FC<Props> = (props) => {
  // Re-render every minute to update the relative time of the history responses.
  use_re_render_on_interval(60 * 1000)

  use_cycle_mode({
    home_view_type: props.home_view_type,
    on_home_view_type_change: props.on_home_view_type_change,
    web_mode: props.web_mode,
    on_web_mode_change: props.on_web_mode_change,
    api_mode: props.api_mode,
    on_api_mode_change: props.on_api_mode_change,
    web_modes: WEB_MODES,
    api_modes: API_MODES
  })

  const is_in_code_completions_mode =
    (props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'code-completions') ||
    (props.home_view_type == HOME_VIEW_TYPES.API &&
      props.api_mode == 'code-completions')

  const show_edit_format_selector =
    (props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'edit-context') ||
    (props.home_view_type == HOME_VIEW_TYPES.API &&
      props.api_mode == 'edit-context')

  const handle_input_change = (value: string) => {
    props.set_instructions(value)
  }

  const handle_submit = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({})
    } else {
      if (is_in_code_completions_mode) {
        props.on_code_completion_click()
      } else {
        props.on_edit_context_click()
      }
    }
  }

  const handle_submit_with_control = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({ show_quick_pick: true })
    } else {
      if (is_in_code_completions_mode) {
        props.on_code_completion_with_quick_pick_click()
      } else {
        props.on_edit_context_with_quick_pick_click()
      }
    }
  }

  const last_choice_button_title = use_last_choice_button_title({
    home_view_type: props.home_view_type,
    selected_preset_or_group_name: props.selected_preset_or_group_name,
    presets: props.presets,
    selected_configuration_id: props.selected_configuration_id,
    configurations: props.configurations
  })

  const scroll_to_top_key = `${props.scroll_reset_key}-${
    props.home_view_type
  }-${
    props.home_view_type == HOME_VIEW_TYPES.WEB
      ? props.web_mode
      : props.api_mode
  }`

  return (
    <>
      <Header
        home_view_type={props.home_view_type}
        on_home_view_type_change={props.on_home_view_type_change}
        on_show_home={props.on_show_home}
        web_mode={props.web_mode}
        on_web_mode_change={props.on_web_mode_change}
        api_mode={props.api_mode}
        on_api_mode_change={props.on_api_mode_change}
        on_quick_action_click={props.on_quick_action_click}
      />
      <Scrollable scroll_to_top_key={scroll_to_top_key}>
        <div className={styles.content}>
          <UiSeparator height={4} />
          {props.response_history.length > 0 && (
            <>
              <div className={styles.responses}>
                {props.response_history.map((item) => (
                  <button
                    key={item.created_at}
                    className={cn(styles['responses__item'], {
                      [styles['responses__item--selected']]:
                        props.response_history.length > 1 &&
                        props.selected_history_item_created_at ==
                          item.created_at
                    })}
                    title={item.raw_instructions}
                    onClick={() => {
                      props.on_response_history_item_click(item)
                      props.on_selected_history_item_change(item.created_at)
                    }}
                  >
                    <span className={styles['responses__item__instruction']}>
                      {item.raw_instructions || 'Response without instructions'}
                    </span>
                    <div className={styles['responses__item__right']}>
                      <div className={styles['responses__item__stats']}>
                        <span
                          className={styles['responses__item__stats--added']}
                        >
                          +{item.lines_added}
                        </span>
                        <span
                          className={styles['responses__item__stats--removed']}
                        >
                          -{item.lines_removed}
                        </span>
                      </div>
                      <span className={styles['responses__item__date']}>
                        {dayjs(item.created_at).fromNow()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {!props.is_connected &&
            props.home_view_type == HOME_VIEW_TYPES.WEB &&
            !props.response_history.length && (
              <>
                <div className={styles['browser-extension-message']}>
                  <UiBrowserExtensionMessage />
                </div>
              </>
            )}

          <div className={styles['chat-input-container']}>
            <UiChatInput
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
              is_web_mode={props.home_view_type == HOME_VIEW_TYPES.WEB}
              is_connected={props.is_connected}
              is_in_code_completions_mode={is_in_code_completions_mode}
              has_active_selection={props.has_active_selection}
              has_active_editor={props.has_active_editor}
              on_caret_position_change={props.on_caret_position_change}
              caret_position_to_set={props.caret_position_to_set}
              on_caret_position_set={props.on_caret_position_set}
              focus_and_select_key={props.chat_input_focus_and_select_key}
              focus_key={props.chat_input_focus_key}
              use_last_choice_button_title={last_choice_button_title}
              show_edit_format_selector={show_edit_format_selector}
              edit_format={
                props.home_view_type == HOME_VIEW_TYPES.WEB
                  ? props.chat_edit_format
                  : props.api_edit_format
              }
              on_edit_format_change={
                props.home_view_type == HOME_VIEW_TYPES.WEB
                  ? props.on_chat_edit_format_change
                  : props.on_api_edit_format_change
              }
              edit_format_instructions={props.edit_format_instructions}
            />
            <UiContextUtilisation
              current_context_size={props.token_count}
              context_size_warning_threshold={
                props.context_size_warning_threshold
              }
            />
          </div>

          {props.home_view_type == HOME_VIEW_TYPES.WEB && (
            <>
              <UiSeparator height={8} />
              <UiPresets
                web_mode={props.web_mode}
                is_connected={props.is_connected}
                has_instructions={!!props.instructions}
                has_context={props.token_count > 0}
                is_in_code_completions_mode={
                  props.web_mode == 'code-completions'
                }
                presets={props.presets}
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
                on_toggle_group_collapsed={props.on_toggle_group_collapsed}
                selected_preset_name={props.selected_preset_or_group_name}
              />
            </>
          )}

          {props.home_view_type == HOME_VIEW_TYPES.API && (
            <>
              <UiSeparator height={8} />
              <UiConfigurations
                api_mode={props.api_mode}
                configurations={props.configurations.map((c) => ({
                  ...c,
                  provider: c.provider_name,
                  cache_enabled: c.instructions_placement == 'below-only'
                }))}
                on_configuration_click={props.on_configuration_click}
                on_reorder={props.on_configurations_reorder}
                selected_configuration_id={props.selected_configuration_id}
                on_manage_configurations={props.on_manage_configurations}
              />
            </>
          )}
        </div>
      </Scrollable>
    </>
  )
}
