import { useState, useEffect, useRef } from 'react'
import styles from './MainView.module.scss'
import { Configurations as UiConfigurations } from '@ui/components/editor/panel/Configurations'
import { Presets as UiPresets } from '@ui/components/editor/panel/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/panel/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/panel/Separator'
import { HorizontalSelector as UiHorizontalSelector } from '@ui/components/editor/panel/HorizontalSelector'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import {
  HOME_VIEW_TYPES,
  HomeViewType
} from '@/views/panel/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { Dropdown as UiDropdown } from '@ui/components/editor/panel/Dropdown'
import { Icon } from '@ui/components/editor/common/Icon'
import cn from 'classnames'
import { IconButton } from '@ui/components/editor/panel/IconButton/IconButton'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { BrowserExtensionMessage as UiBrowserExtensionMessage } from '@ui/components/editor/panel/BrowserExtensionMessage'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { use_last_choice_button_title } from './hooks/use-last-choice-button-title'

type Props = {
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
  on_at_sign_click: () => void
  on_curly_braces_click: () => void
  on_quick_action_click: (command: string) => void
  on_commit_click: () => void
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
  has_changes_to_commit: boolean
  can_undo: boolean
  chat_history: string[]
  token_count: number
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
  commit_button_enabling_trigger_count: number // Incremented when commit changes operation is cancelled
}

const web_mode_labels: Record<WebMode, string> = {
  'edit-context': 'Edit context',
  ask: 'Ask about context',
  'no-context': 'No context',
  'code-completions': 'Code at cursor'
}

const api_mode_labels: Record<ApiMode, string> = {
  'edit-context': 'Edit context',
  'code-completions': 'Code at cursor'
}

export const MainView: React.FC<Props> = (props) => {
  // We need this because we can't use overflow: hidden
  // due to absolutely positioned dropdown menu.
  const [dropdown_max_width, set_dropdown_max_width] = useState<
    number | undefined
  >(undefined)

  const dropdown_container_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const top_left_ref = useRef<HTMLDivElement>(null)
  const [is_buy_me_coffee_hovered, set_is_buy_me_coffee_hovered] =
    useState(false)
  const [is_commit_disabled_temporarily, set_is_commit_disabled_temporarily] =
    useState(false)
  const [is_apply_disabled_temporarily, set_is_apply_disabled_temporarily] =
    useState(false)
  const [is_undo_disabled_temporarily, set_is_undo_disabled_temporarily] =
    useState(false)

  const calculate_dropdown_max_width = () => {
    if (!container_ref.current || !top_left_ref.current) return

    const container_width = container_ref.current.offsetWidth
    const top_left_width = top_left_ref.current.offsetWidth
    const calculated_width = container_width - top_left_width - 36

    set_dropdown_max_width(calculated_width)
  }

  useEffect(() => {
    if (!container_ref.current || !top_left_ref.current) return

    const resize_observer = new ResizeObserver(() => {
      calculate_dropdown_max_width()
    })

    resize_observer.observe(container_ref.current)
    resize_observer.observe(top_left_ref.current)

    calculate_dropdown_max_width()

    return () => {
      resize_observer.disconnect()
    }
  }, [])

  useEffect(() => {
    set_is_commit_disabled_temporarily(false)
  }, [props.commit_button_enabling_trigger_count])

  const is_in_code_completions_mode =
    (props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'code-completions') ||
    (props.home_view_type == HOME_VIEW_TYPES.API &&
      props.api_mode == 'code-completions')

  const handle_input_change = (value: string) => {
    props.set_instructions(value)
  }

  const handle_submit = async () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.initialize_chats({})
    } else {
      set_is_undo_disabled_temporarily(false)
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
      set_is_undo_disabled_temporarily(false)
      if (is_in_code_completions_mode) {
        props.on_code_completion_with_quick_pick_click()
      } else {
        props.on_edit_context_with_quick_pick_click()
      }
    }
  }

  const handle_apply_click = () => {
    set_is_apply_disabled_temporarily(true)
    props.on_quick_action_click('codeWebChat.applyChatResponse')

    setTimeout(() => set_is_apply_disabled_temporarily(false), 10000)
  }

  useEffect(() => {
    // Timeout prevents jitter of non disabled state caused by order of updates,
    // effect below reacting to props.can_apply_clipboard is fine.
    setTimeout(() => {
      set_is_apply_disabled_temporarily(false)
    }, 500)
  }, [props.can_undo])

  const handle_undo_click = () => {
    if (!props.can_undo) return

    set_is_undo_disabled_temporarily(true)
    props.on_quick_action_click('codeWebChat.undo')

    setTimeout(() => set_is_undo_disabled_temporarily(false), 10000)
  }

  const handle_commit_click = () => {
    if (!props.has_changes_to_commit) return

    set_is_commit_disabled_temporarily(true)
    props.on_commit_click()
  }

  const handle_heading_click = () => {
    if (props.home_view_type == HOME_VIEW_TYPES.WEB) {
      props.on_home_view_type_change(HOME_VIEW_TYPES.API)
    } else {
      props.on_home_view_type_change(HOME_VIEW_TYPES.WEB)
    }
  }

  const last_choice_button_title = use_last_choice_button_title({
    home_view_type: props.home_view_type,
    selected_preset_or_group_name: props.selected_preset_or_group_name,
    presets: props.presets,
    selected_configuration_id: props.selected_configuration_id,
    configurations: props.configurations
  })

  return (
    <div ref={container_ref} className={styles.container}>
      <Scrollable>
        <div className={styles.inner}>
          <div className={styles.top}>
            <div className={styles.top__left} ref={top_left_ref}>
              <IconButton
                codicon_icon="chevron-left"
                on_click={props.on_show_home}
                title="Return to Home"
              />
              <button
                className={styles['top__left__toggler']}
                onClick={handle_heading_click}
                title="Toggle view type"
              >
                {props.home_view_type == HOME_VIEW_TYPES.WEB
                  ? 'New chat'
                  : 'API call'}
              </button>
            </div>

            <div className={styles.top__right} ref={dropdown_container_ref}>
              {props.home_view_type == HOME_VIEW_TYPES.WEB && (
                <UiDropdown
                  options={Object.entries(web_mode_labels).map(
                    ([value, label]) => ({ value: value as WebMode, label })
                  )}
                  selected_value={props.web_mode}
                  on_change={props.on_web_mode_change}
                  title={`Current mode: ${web_mode_labels[props.web_mode]}`}
                  max_width={dropdown_max_width}
                />
              )}
              {props.home_view_type == HOME_VIEW_TYPES.API && (
                <UiDropdown
                  options={Object.entries(api_mode_labels).map(
                    ([value, label]) => ({ value: value as ApiMode, label })
                  )}
                  selected_value={props.api_mode}
                  on_change={props.on_api_mode_change}
                  title={`Current mode: ${api_mode_labels[props.api_mode]}`}
                  max_width={dropdown_max_width}
                />
              )}
            </div>
          </div>

          <UiSeparator height={8} />

          {!props.is_connected &&
            props.home_view_type == HOME_VIEW_TYPES.WEB && (
              <div className={styles['browser-extension-message']}>
                <UiBrowserExtensionMessage />
              </div>
            )}

          <div className={styles['chat-input']}>
            <UiChatInput
              value={props.instructions}
              chat_history={props.chat_history}
              on_change={handle_input_change}
              on_submit={handle_submit}
              on_submit_with_control={handle_submit_with_control}
              on_copy={props.copy_to_clipboard}
              on_search_click={props.on_search_click}
              on_at_sign_click={props.on_at_sign_click}
              on_curly_braces_click={props.on_curly_braces_click}
              has_context={props.token_count > 0}
              is_web_mode={props.home_view_type == HOME_VIEW_TYPES.WEB}
              is_connected={props.is_connected}
              token_count={props.token_count}
              is_in_code_completions_mode={is_in_code_completions_mode}
              has_active_selection={props.has_active_selection}
              has_active_editor={props.has_active_editor}
              on_caret_position_change={props.on_caret_position_change}
              caret_position_to_set={props.caret_position_to_set}
              on_caret_position_set={props.on_caret_position_set}
              focus_and_select_key={props.chat_input_focus_and_select_key}
              focus_key={props.chat_input_focus_key}
              use_last_choice_button_title={last_choice_button_title}
            />
          </div>

          {((props.home_view_type == HOME_VIEW_TYPES.WEB &&
            props.web_mode == 'edit-context') ||
            (props.home_view_type == HOME_VIEW_TYPES.API &&
              props.api_mode == 'edit-context')) && (
            <div className={styles['edit-format']}>
              <span>
                +{' '}
                <span
                  title="Style of generated code blocks"
                  style={{
                    textDecoration: 'dotted underline',
                    cursor: 'help'
                  }}
                >
                  edit format
                </span>{' '}
                instructions:
              </span>
              <UiHorizontalSelector
                options={[
                  {
                    value: 'whole',
                    label: 'whole',
                    title: `Instructions included in every message: "${props.edit_format_instructions.whole}"`
                  },
                  {
                    value: 'truncated',
                    label: 'truncated',
                    title: `Instructions included in every message: "${props.edit_format_instructions.truncated}"`
                  },
                  {
                    value: 'diff',
                    label: 'diff',
                    title: `Instructions included in every message: "${props.edit_format_instructions.diff}"`
                  }
                ]}
                selected_value={
                  props.home_view_type == HOME_VIEW_TYPES.WEB
                    ? props.chat_edit_format
                    : props.api_edit_format
                }
                on_select={(value) =>
                  props.home_view_type == HOME_VIEW_TYPES.WEB
                    ? props.on_chat_edit_format_change(value as EditFormat)
                    : props.on_api_edit_format_change(value as EditFormat)
                }
              />
            </div>
          )}

          {props.home_view_type == HOME_VIEW_TYPES.WEB && (
            <>
              <UiSeparator height={14} />
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
              <UiSeparator height={14} />
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

      <div className={styles.footer}>
        <div className={styles.footer__left}>
          <a
            className={cn(
              styles.footer__button,
              styles['footer__button--buy-me-a-coffee']
            )}
            href="https://buymeacoffee.com/robertpiosik"
            title="Support author"
            onMouseEnter={() => set_is_buy_me_coffee_hovered(true)}
            onMouseLeave={() => set_is_buy_me_coffee_hovered(false)}
          >
            <Icon variant="BUY_ME_A_COFFEE_LOGO" />
          </a>
        </div>
        <div className={styles.footer__right}>
          {props.home_view_type == HOME_VIEW_TYPES.WEB && (
            <button
              className={cn(
                styles.footer__button,
                styles['footer__button--outlined']
              )}
              onClick={handle_apply_click}
              title={'Integrate copied message or a code block'}
              disabled={is_apply_disabled_temporarily}
            >
              APPLY
            </button>
          )}
          <button
            className={cn(
              styles.footer__button,
              styles['footer__button--outlined']
            )}
            onClick={handle_undo_click}
            title={
              props.can_undo
                ? 'Restore saved state of the codebase after chat/API response integration'
                : 'Nothing to undo'
            }
            disabled={!props.can_undo || is_undo_disabled_temporarily}
          >
            UNDO
          </button>
          <button
            className={cn(
              styles.footer__button,
              styles['footer__button--outlined']
            )}
            onClick={handle_commit_click}
            title={
              props.has_changes_to_commit && !is_commit_disabled_temporarily
                ? 'Generate a commit message of staged changes and commit'
                : 'No changes to commit'
            }
            disabled={
              !props.has_changes_to_commit || is_commit_disabled_temporarily
            }
          >
            COMMIT
          </button>
        </div>
      </div>

      {is_buy_me_coffee_hovered &&
        Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={styles.footer__heart}
            style={
              {
                left: `${18 + (Math.random() - 0.5) * 20}px`,
                animationDelay: `${i == 0 ? 0 : (i + Math.random()) / 3}s`,
                animationDuration: `${2 - Math.random()}s`,
                fontSize: `${10 + Math.random() * 8}px`
              } as React.CSSProperties
            }
          >
            ❤️
          </span>
        ))}
    </div>
  )
}
