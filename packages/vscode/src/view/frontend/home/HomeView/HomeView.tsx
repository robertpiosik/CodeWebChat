import { useState, useEffect, useRef } from 'react'
import styles from './HomeView.module.scss'
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
import { QuickAction as UiQuickAction } from '@ui/components/editor/QuickAction'
import { IconButton } from '@ui/components/editor/IconButton/IconButton'
import { Scrollable } from '@ui/components/editor/Scrollable'

type Props = {
  initialize_chats: (params: { prompt: string; preset_names: string[] }) => void
  copy_to_clipboard: (instruction: string, preset_name?: string) => void
  on_show_intro: () => void
  on_search_click: () => void
  on_create_preset: () => void
  on_at_sign_click: () => void
  on_curly_braces_click: () => void
  on_quick_action_click: (command: string) => void
  is_connected: boolean
  presets: Preset[]
  selected_presets: string[]
  has_active_editor: boolean
  has_active_selection: boolean
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
  on_set_default_presets: () => void
  instructions: string
  set_instructions: (value: string) => void
  on_caret_position_change: (caret_position: number) => void
  home_view_type: HomeViewType
  on_home_view_type_change: (value: HomeViewType) => void
  on_edit_context_click: () => void
  on_edit_context_with_quick_pick_click: () => void
  on_code_completion_click: () => void
  on_code_completion_with_quick_pick_click: () => void
}

const web_mode_labels: Record<WebMode, string> = {
  ask: 'Ask about context',
  edit: 'Edit context',
  'code-completions': 'Code at cursor',
  'no-context': 'No context'
}

const api_mode_labels: Record<ApiMode, string> = {
  edit: 'Edit context',
  'code-completions': 'Code at cursor'
}

export const HomeView: React.FC<Props> = (props) => {
  const [estimated_input_tokens, set_estimated_input_tokens] = useState(0)
  // We need this because we can't use overflow: hidden
  // due to absolutely positioned dropdown menu
  const [dropdown_max_width, set_dropdown_max_width] = useState<
    number | undefined
  >(undefined)

  const dropdown_container_ref = useRef<HTMLDivElement>(null)
  const container_ref = useRef<HTMLDivElement>(null)
  const switch_container_ref = useRef<HTMLDivElement>(null)
  const [is_showing_commands, set_is_showing_commands] = useState(false)

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

  const current_prompt = props.instructions

  useEffect(() => {
    let estimated_tokens = 0
    let text = current_prompt

    if (
      text.includes('@Selection') &&
      props.has_active_selection &&
      props.selection_text
    ) {
      text = text.replace(/@Selection/g, props.selection_text)
    }

    estimated_tokens = Math.ceil(text.length / 4)
    set_estimated_input_tokens(props.token_count + estimated_tokens)
  }, [
    current_prompt,
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
      props.initialize_chats({
        prompt: current_prompt,
        preset_names: props.selected_presets
      })
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
      props.initialize_chats({
        prompt: current_prompt,
        preset_names: []
      })
    } else {
      if (is_in_code_completions_mode) {
        props.on_code_completion_with_quick_pick_click()
      } else {
        props.on_edit_context_with_quick_pick_click()
      }
    }
  }

  const handle_copy = () => {
    props.copy_to_clipboard(current_prompt)
  }

  const handle_preset_copy = (preset_name: string) => {
    props.copy_to_clipboard(current_prompt, preset_name)
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
              <>
                <div className={styles['browser-extension-message']}>
                  <span>
                    Get the Connector browser extension for hands-free chat
                    inititalizations
                  </span>
                  <a href="https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
                    Chrome Web Store ↗
                  </a>
                  <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
                    Firefox Add-ons ↗
                  </a>
                </div>

                <UiSeparator height={8} />
              </>
            )}

          <div className={styles['chat-input']}>
            <UiChatInput
              value={current_prompt}
              chat_history={props.chat_history}
              on_change={handle_input_change}
              on_submit={handle_submit}
              on_submit_with_control={handle_submit_with_control}
              on_copy={
                props.home_view_type == HOME_VIEW_TYPES.WEB &&
                props.web_mode != 'no-context'
                  ? handle_copy
                  : undefined
              }
              on_search_click={props.on_search_click}
              on_at_sign_click={props.on_at_sign_click}
              on_curly_braces_click={props.on_curly_braces_click}
              is_web_mode={props.home_view_type == HOME_VIEW_TYPES.WEB}
              is_connected={props.is_connected}
              token_count={estimated_input_tokens}
              submit_disabled_title={
                !props.is_connected
                  ? 'WebSocket connection not established. Please install the browser extension.'
                  : 'Type something'
              }
              is_in_code_completions_mode={is_in_code_completions_mode}
              has_active_selection={props.has_active_selection}
              has_active_editor={props.has_active_editor}
              on_caret_position_change={props.on_caret_position_change}
              translations={{
                type_something: 'Type something',
                completion_instructions: 'Completion instructions',
                send_request: 'Send request',
                initialize_chat: 'Initialize chat',
                select_preset: 'Select preset',
                select_config: 'Select config',
                code_completions_mode_unavailable_with_text_selection:
                  'Unable to work with text selection',
                code_completions_mode_unavailable_without_active_editor:
                  'This mode requires active editor',
                search: 'Search history'
              }}
            />
          </div>

          {((props.home_view_type == HOME_VIEW_TYPES.WEB &&
            props.web_mode == 'edit') ||
            (props.home_view_type == HOME_VIEW_TYPES.API &&
              props.api_mode == 'edit')) && (
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
              <UiSeparator height={16} />
              <UiPresets
                presets={props.presets.map((preset) => {
                  return {
                    ...preset,
                    has_affixes: !!(
                      preset.prompt_prefix || preset.prompt_suffix
                    )
                  }
                })}
                is_disabled={!props.is_connected}
                selected_presets={props.selected_presets}
                on_create_preset={props.on_create_preset}
                on_preset_click={(name) => {
                  props.initialize_chats({
                    prompt: current_prompt,
                    preset_names: [name]
                  })
                }}
                on_preset_copy={handle_preset_copy}
                on_preset_edit={props.on_preset_edit}
                on_presets_reorder={props.on_presets_reorder}
                on_preset_duplicate={props.on_preset_duplicate}
                on_preset_delete={props.on_preset_delete}
                on_set_default_presets={props.on_set_default_presets}
              />
            </>
          )}
        </div>
      </Scrollable>
      <div
        className={cn(styles.commands, {
          [styles['commands--visible']]: is_showing_commands
        })}
      >
        <UiQuickAction
          title="Apply Chat Response"
          description="Integrate copied message or a code block"
          on_click={() =>
            props.on_quick_action_click('codeWebChat.applyChatResponse')
          }
        />
        <UiQuickAction
          title="Revert Last Changes"
          description="Restore saved state of the codebase"
          on_click={() => props.on_quick_action_click('codeWebChat.revert')}
        />
        <UiQuickAction
          title="Commit Changes"
          description="Generate a commit message and commit"
          on_click={() =>
            props.on_quick_action_click('codeWebChat.commitChanges')
          }
        />
      </div>

      <div className={styles.footer}>
        <a
          className={cn(
            styles.footer__button,
            styles['footer__button--buy-me-a-coffee']
          )}
          href="https://buymeacoffee.com/robertpiosik"
          title="Support author"
        >
          <Icon variant="BUY_ME_A_COFFEE" />
        </a>
        <a
          className={cn(
            styles.footer__button,
            styles['footer__button--filled']
          )}
          href="https://x.com/CodeWebChat"
          title="@CodeWebChat"
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
          title="Join /r/CodeWebChat"
        >
          <Icon variant="REDDIT" />
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
            COMMUNITY
          </span>
        </a>
        <button
          className={cn(
            styles.footer__button,
            styles['footer__button--outlined'],
            is_showing_commands
              ? styles['footer__button--outlined-active']
              : '',
            styles['footer__button--quick-actions'],
            is_showing_commands
              ? styles['footer__button--quick-actions-after-visible']
              : ''
          )}
          onClick={() => {
            set_is_showing_commands(!is_showing_commands)
          }}
          title="Handy access to core commands"
        >
          {is_showing_commands ? (
            <span className="codicon codicon-chevron-down" />
          ) : (
            <span className="codicon codicon-chevron-up" />
          )}
          QUICK ACTIONS
        </button>
      </div>
    </div>
  )
}
