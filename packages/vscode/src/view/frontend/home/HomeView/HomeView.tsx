import { useState, useEffect, useRef } from 'react'
import styles from './HomeView.module.scss'
import { Configurations as UiConfigurations } from '@ui/components/editor/Configurations'
import { Presets as UiPresets } from '@ui/components/editor/Presets'
import { ChatInput as UiChatInput } from '@ui/components/editor/ChatInput'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { HorizontalSelector as UiHorizontalSelector } from '@ui/components/editor/HorizontalSelector'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { Switch as UiSwitch } from '@ui/components/editor/Switch'
import { HOME_VIEW_TYPES, HomeViewType } from '@/view/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { Dropdown as UiDropdown } from '@ui/components/editor/Dropdown'
import { Icon } from '@ui/components/editor/Icon'
import cn from 'classnames'
import { IconButton } from '@ui/components/editor/IconButton/IconButton'
import { Scrollable } from '@ui/components/editor/Scrollable'
import { BrowserExtensionMessage as UiBrowserExtensionMessage } from '@ui/components/editor/BrowserExtensionMessage'
import { ApiToolConfiguration } from '@/view/types/messages'

type Props = {
  initialize_chats: (params: {
    preset_name?: string
    group_name?: string
    show_quick_pick?: boolean
  }) => void
  copy_to_clipboard: (preset_name?: string) => void
  on_show_intro: () => void
  on_search_click: () => void
  on_create_preset: () => void
  on_at_sign_click: () => void
  on_curly_braces_click: () => void
  on_quick_action_click: (command: string) => void
  is_connected: boolean
  presets: Preset[]
  configurations: ApiToolConfiguration[]
  on_manage_configurations_click: () => void
  on_configuration_click: (index: number) => void
  has_active_editor: boolean
  has_active_selection: boolean
  has_changes_to_commit: boolean
  can_apply_clipboard: boolean
  can_revert: boolean
  chat_history: string[]
  token_count: number
  selection_text?: string
  web_mode: WebMode
  api_mode: ApiMode
  on_web_mode_change: (mode: WebMode) => void
  on_api_mode_change: (mode: ApiMode) => void
  chat_edit_format: EditFormat
  api_edit_format: EditFormat
  on_chat_edit_format_change: (edit_format: EditFormat) => void
  on_api_edit_format_change: (edit_format: EditFormat) => void
  on_presets_reorder: (reordered_presets: Preset[]) => void
  on_preset_edit: (preset_name: string) => void
  on_preset_duplicate: (preset_name: string) => void
  on_preset_delete: (preset_name: string) => void
  on_toggle_default_preset: (name: string) => void
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
}

const web_mode_labels: Record<WebMode, string> = {
  ask: 'Ask about context',
  'edit-context': 'Edit context',
  'code-completions': 'Code at cursor',
  'no-context': 'No context'
}

const api_mode_labels: Record<ApiMode, string> = {
  'edit-context': 'Edit context',
  'code-completions': 'Code at cursor'
}

export const HomeView: React.FC<Props> = (props) => {
  const [estimated_input_tokens, set_estimated_input_tokens] = useState(0)
  // We need this because we can't use overflow: hidden
  // due to absolutely positioned dropdown menu.
  const [dropdown_max_width, set_dropdown_max_width] = useState<
    number | undefined
  >(undefined)

  const dropdown_container_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const switch_container_ref = useRef<HTMLDivElement>(null)
  const [is_buy_me_coffee_hovered, set_is_buy_me_coffee_hovered] =
    useState(false)

  const calculate_dropdown_max_width = () => {
    if (!container_ref.current || !switch_container_ref.current) return

    const container_width = container_ref.current.offsetWidth
    const switch_width = switch_container_ref.current.offsetWidth
    const calculated_width = container_width - switch_width - 56

    set_dropdown_max_width(calculated_width)
  }

  useEffect(() => {
    if (!container_ref.current || !switch_container_ref.current) return

    const resize_observer = new ResizeObserver(() => {
      calculate_dropdown_max_width()
    })

    resize_observer.observe(container_ref.current)
    resize_observer.observe(switch_container_ref.current)

    calculate_dropdown_max_width()

    return () => {
      resize_observer.disconnect()
    }
  }, [])

  const is_in_code_completions_mode =
    (props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'code-completions') ||
    (props.home_view_type == HOME_VIEW_TYPES.API &&
      props.api_mode == 'code-completions')

  useEffect(() => {
    let estimated_tokens = 0
    let text = props.instructions

    if (
      text.includes('@Selection') &&
      props.has_active_selection &&
      props.selection_text
    ) {
      text = text.replace(/@Selection/g, props.selection_text)
    }

    estimated_tokens = Math.ceil(text.length / 4)
    if (
      props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'no-context'
    ) {
      set_estimated_input_tokens(estimated_tokens)
    } else {
      set_estimated_input_tokens(props.token_count + estimated_tokens)
    }
  }, [
    props.instructions,
    props.home_view_type,
    props.has_active_selection,
    props.selection_text,
    props.token_count
  ])

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

  const handle_copy = () => {
    props.copy_to_clipboard(props.instructions)
  }

  const handle_preset_copy = (preset_name: string) => {
    props.copy_to_clipboard(preset_name)
  }

  return (
    <div ref={container_ref} className={styles.container}>
      <Scrollable>
        <div className={styles.inner}>
          <div className={styles.top}>
            <div className={styles.top__left}>
              <IconButton
                codicon_icon="chevron-left"
                on_click={props.on_show_intro}
                title="Return to getting started"
              />
              <div ref={switch_container_ref}>
                <UiSwitch
                  value={props.home_view_type}
                  on_change={props.on_home_view_type_change}
                  options={Object.values(HOME_VIEW_TYPES)}
                />
              </div>
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
              on_copy={
                props.home_view_type == HOME_VIEW_TYPES.WEB
                  ? handle_copy
                  : undefined
              }
              on_search_click={props.on_search_click}
              on_at_sign_click={props.on_at_sign_click}
              on_curly_braces_click={props.on_curly_braces_click}
              has_context={props.token_count > 0}
              is_web_mode={props.home_view_type == HOME_VIEW_TYPES.WEB}
              is_connected={props.is_connected}
              token_count={estimated_input_tokens}
              is_in_code_completions_mode={is_in_code_completions_mode}
              has_active_selection={props.has_active_selection}
              has_active_editor={props.has_active_editor}
              on_caret_position_change={props.on_caret_position_change}
              translations={{
                type_something: 'Type something',
                completion_instructions: 'Completion instructions',
                use_default: 'Use default',
                last_selection: 'Use last choice',
                select: 'Select',
                code_completions_mode_unavailable_with_text_selection:
                  'Remove text selection',
                code_completions_mode_unavailable_without_active_editor:
                  'Place cursor for completion',
                search: 'Search history',
                websocket_not_connected:
                  'Install or reload the browser extension',
                for_history_hint: '(⇅ for history)',
                copy_to_clipboard: 'Copy to clipboard',
                insert_symbol: 'Insert symbol',
                prompt_templates: 'Prompt templates',
                approximate_token_count: 'Approximate message length in tokens'
              }}
              caret_position_to_set={props.caret_position_to_set}
              on_caret_position_set={props.on_caret_position_set}
            />
          </div>

          {((props.home_view_type == HOME_VIEW_TYPES.WEB &&
            props.web_mode == 'edit-context') ||
            (props.home_view_type == HOME_VIEW_TYPES.API &&
              props.api_mode == 'edit-context')) && (
            <>
              <div className={styles['edit-format']}>
                <span>
                  +{' '}
                  <span
                    title="Style of generated code blocks"
                    style={{
                      textDecoration: 'dotted underline'
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
                      title:
                        'The model will output modified files in full. The best quality, especially from smaller models. Changed fragments are not clearly visible in a web chat interface.'
                    },
                    {
                      value: 'truncated',
                      label: 'truncated',
                      title:
                        'The model will skip unchanged fragments in modified files. Changes are clearly visible but requires Intelligent Update API tool to apply. Smaller, fast models like Gemini Flash are sufficient.'
                    },
                    {
                      value: 'diff',
                      label: 'diff',
                      title:
                        'The model will output patches. Less readable, cheap to generate and fast to apply. Models may struggle with diff correctness - might use the Intelligent Update API tool in a fallback mechanism.'
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
            </>
          )}

          {props.home_view_type == HOME_VIEW_TYPES.WEB && (
            <>
              <UiSeparator height={14} />
              <UiPresets
                web_mode={props.web_mode}
                is_connected={props.is_connected}
                has_active_editor={props.has_active_editor}
                has_active_selection={props.has_active_selection}
                has_instructions={!!props.instructions}
                has_context={props.token_count > 0}
                is_in_code_completions_mode={
                  props.web_mode == 'code-completions'
                }
                presets={props.presets}
                on_create_preset={props.on_create_preset}
                on_preset_click={(preset_name) =>
                  props.initialize_chats({
                    preset_name,
                    show_quick_pick: false
                  })
                }
                on_group_click={(group_name) =>
                  props.initialize_chats({ group_name })
                }
                on_preset_copy={handle_preset_copy}
                on_preset_edit={props.on_preset_edit}
                on_presets_reorder={props.on_presets_reorder}
                on_preset_duplicate={props.on_preset_duplicate}
                on_preset_delete={props.on_preset_delete}
                on_toggle_default_preset={props.on_toggle_default_preset}
                translations={{
                  my_chat_presets: 'MY CHAT PRESETS',
                  set_presets_opening_by_default:
                    'Set presets opening by default',
                  not_connected:
                    'Not connected. Ensure the browser extension is active',
                  preset_requires_active_editor:
                    'Preset in this mode requires an active editor',
                  preset_cannot_be_used_with_selection:
                    'Preset in this mode cannot be used with a text selection',
                  initialize_chat_with_preset:
                    'Initialize chat with this preset',
                  type_or_add_prompt_to_use_preset:
                    'Type something or add a prefix/suffix to this preset to use it',
                  copy_to_clipboard: 'Copy to clipboard',
                  duplicate: 'Duplicate',
                  edit: 'Edit',
                  delete: 'Delete',
                  create: 'Create...',
                  set_as_default: 'Set as default',
                  unset_as_default: 'Unset as default',
                  no_preset_enabled_or_selected_in_this_group:
                    'No preset is enabled or selected in this group'
                }}
              />
            </>
          )}

          {props.home_view_type == HOME_VIEW_TYPES.API && (
            <>
              <UiSeparator height={14} />
              <UiConfigurations
                has_active_editor={props.has_active_editor}
                has_active_selection={props.has_active_selection}
                has_instructions={!!props.instructions}
                has_context={props.token_count > 0}
                api_mode={props.api_mode}
                configurations={props.configurations.map((c) => ({
                  model: c.model,
                  provider: c.provider_name,
                  reasoning_effort: c.reasoning_effort,
                  temperature: c.temperature,
                  is_default: c.is_default
                }))}
                on_configuration_click={props.on_configuration_click}
                on_manage_configurations={props.on_manage_configurations_click}
                translations={{
                  my_configurations: 'MY CONFIGURATIONS',
                  add_files_to_context_first:
                    'Add some files to the context first',
                  configuration_requires_active_editor:
                    'Configuration in this mode requires an active editor',
                  configuration_cannot_be_used_with_selection:
                    'Configuration in this mode cannot be used with a text selection',
                  manage_configurations: 'Manage Configurations'
                }}
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
            <Icon variant="BUY_ME_A_COFFEE" />
          </a>
          <a
            className={cn(
              styles.footer__button,
              styles['footer__button--filled']
            )}
            href="https://x.com/CodeWebChat"
            title="Follow on X"
          >
            <Icon variant="X" />
          </a>
          <a
            className={cn(
              styles.footer__button,
              styles['footer__button--filled']
            )}
            href="https://www.reddit.com/r/CodeWebChat/"
            style={{ overflow: 'hidden' }}
            title="Join subreddit"
          >
            <Icon variant="REDDIT" />
          </a>
        </div>
        <div className={styles.footer__right}>
          <button
            className={cn(
              styles.footer__button,
              styles['footer__button--outlined']
            )}
            onClick={() => {
              props.on_quick_action_click('codeWebChat.applyChatResponse')
            }}
            title={
              props.can_apply_clipboard
                ? 'Integrate copied message or a code block'
                : 'Nothing applicable found in clipboard'
            }
            disabled={!props.can_apply_clipboard}
          >
            APPLY
          </button>
          <button
            className={cn(
              styles.footer__button,
              styles['footer__button--outlined']
            )}
            onClick={() => {
              props.on_quick_action_click('codeWebChat.revert')
            }}
            title={
              props.can_revert
                ? 'Restore saved state of the codebase after chat/API response integration'
                : 'Nothing to revert'
            }
            disabled={!props.can_revert}
          >
            REVERT
          </button>
          <button
            className={cn(
              styles.footer__button,
              styles['footer__button--outlined']
            )}
            onClick={() => {
              if (!props.has_changes_to_commit) return
              props.on_quick_action_click('codeWebChat.commitChanges')
            }}
            title={
              props.has_changes_to_commit
                ? 'Generate a commit message and commit'
                : 'No changes to commit'
            }
            disabled={!props.has_changes_to_commit}
          >
            COMMIT
          </button>
        </div>
        {is_buy_me_coffee_hovered &&
          Array.from({ length: 3 }).map((_, i) => (
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
    </div>
  )
}
