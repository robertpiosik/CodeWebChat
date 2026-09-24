import { useState } from 'react'
import styles from './MainView.module.scss'
import { Configurations as UiConfigurations } from '@ui/components/editor/prompt/Configurations'
import { PromptField as UiPromptField } from '@ui/components/editor/common/prompts/PromptField'
import { PromptAttachments } from './components/PromptAttachments'
import { Spacer as UiSpacer } from '@ui/components/editor/prompt/Spacer'
import { WebConfiguration } from '@shared/types/web-configuration'
import { AgentConfiguration } from '@shared/types/agent-configuration'
import { Responses as UiResponses } from '@ui/components/editor/prompt/Responses'
import { StatusBar as UiStatusBar } from '@ui/components/editor/prompt/StatusBar'
import { ResponseHistoryItem } from '@shared/types/response-history-item'
import { EditFormat } from '@shared/types/edit-format'
import { Target } from '@shared/types/target'
import {
  ApiPromptType,
  WebPromptType,
  CliPromptType
} from '@shared/types/prompt-types'
import { Scrollable as UiScrollable } from '@ui/components/editor/common/Scrollable'
import { BrowserConnectionStatus } from './components/BrowserConnectionStatus'
import { ApiConfiguration, SetupProgress } from '@/views/prompt/types/messages'
import { use_last_choice_tooltip } from './hooks/use-last-choice-tooltip'
import { use_browser_connection_status } from './hooks/use-browser-connection-status'
import { use_keyboard_shortcuts } from './hooks/use-keyboard-shortcuts'
import { Header } from './components/Header'
import { SelectionState } from '@/views/prompt/types/messages'
import { use_is_landscape } from '../../hooks/use-is-landscape'
import { use_translation } from '../../i18n/use-translation'
import { Icon } from '@ui/components/editor/common/Icon'
import { CHATBOTS } from '@shared/constants/chatbots'

type Props = {
  scroll_reset_key: number
  initialize_chats: (params: {
    web_configuration_name?: string
    show_quick_pick?: boolean
  }) => void
  on_copy: () => void
  on_show_home: () => void
  on_create_web_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_at_sign_click: (search_value?: string) => void
  on_hash_sign_click: () => void
  on_slash_click: () => void
  on_quick_action_click: (command: string) => void
  is_connected: boolean
  web_configurations: WebConfiguration[]
  api_configurations: ApiConfiguration[]
  on_api_configuration_click: (id: string) => void
  on_api_configurations_reorder: (
    reordered_configurations: UiConfigurations.Configuration[]
  ) => void
  on_toggle_pinned_api_configuration: (id: string) => void
  on_edit_api_configuration: (id: string) => void
  on_delete_api_configuration: (id: string) => void
  on_create_api_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  agent_configurations: AgentConfiguration[]
  on_agent_configuration_click: (name: string) => void
  on_agent_configurations_reorder: (
    reordered_configurations: AgentConfiguration[]
  ) => void
  on_toggle_pinned_agent_configuration: (name: string) => void
  on_edit_agent_configuration: (name: string) => void
  on_delete_agent_configuration: (name: string) => void
  on_create_agent_configuration: (params?: {
    insertion_index?: number
    exact_insertion?: boolean
  }) => void
  on_manage_models: () => void
  on_manage_providers: () => void
  currently_open_file_path?: string
  current_selection?: SelectionState | null
  chat_history: string[]
  selected_files_token_count: number
  edit_instructions_token_count: number
  ask_instructions_token_count: number
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  cli_prompt_type: CliPromptType
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
  on_cli_prompt_type_change: (prompt_type: CliPromptType) => void
  edit_format: EditFormat
  on_edit_format_change: (format?: EditFormat) => void
  on_web_configurations_reorder: (
    reordered_web_configurations: WebConfiguration[]
  ) => void
  on_web_configuration_edit: (web_configuration_name: string) => void
  on_delete_web_configuration: (name: string) => void
  on_toggle_web_configuration_pinned: (name: string) => void
  selected_web_configuration_name?: string
  selected_api_configuration_id?: string
  selected_agent_configuration_name?: string
  instructions: string
  set_instructions: (value: string) => void
  on_caret_position_change: (caret_position: number) => void
  target: Target
  on_target_change: (value: Target) => void
  on_make_api_call: (use_quick_pick: boolean) => void
  on_invoke_agentic_cli: (use_quick_pick: boolean) => void
  caret_position_to_set?: number
  on_caret_position_set?: () => void
  chat_input_focus_and_select_key: number
  chat_input_focus_key: number
  response_history: ResponseHistoryItem[]
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_remove: (created_at: number) => void
  selected_files: string[]
  send_with_shift_enter: boolean
  currently_open_file_text?: string
  on_go_to_file: (file_path: string) => void
  on_pasted_lines_click: (path: string, start?: string, end?: string) => void
  on_open_url: (url: string) => void
  on_open_website: (url: string) => void
  are_keyboard_shortcuts_disabled: boolean
  on_paste_image: (base64_content: string) => void
  on_open_image: (hash: string) => void
  on_paste_long_text: (text: string) => void
  on_open_pasted_text: (hash: string) => void
  on_paste_url: (url: string) => void
  is_recording: boolean
  on_recording_started: () => void
  on_recording_finished: () => void
  is_setup_complete: boolean
  setup_progress?: SetupProgress
  tabs_count: number
  active_tab_index: number
  on_tab_change: (index: number) => void
  on_new_tab: () => void
  on_tab_delete: (index: number) => void
  on_tabs_reorder: (new_order: number[]) => void
  voice_input_push_to_talk: boolean
  on_preview_prompt: () => void
  on_changes_click?: (branch_name: string) => void
  on_commit_click?: (
    repo_name: string,
    commit_hash: string,
    type: 'Commit' | 'CommitMessage',
    commit_message?: string
  ) => void
  on_skill_click?: (agent: string, repo: string, skill_name: string) => void
  on_install_browser_extension: () => void
  on_agentic_search: () => void
}

const chatbot_to_icon: Record<keyof typeof CHATBOTS, Icon.Variant> = {
  'AI Studio': 'AI_STUDIO',
  ChatGPT: 'CHATGPT',
  Claude: 'CLAUDE',
  Copilot: 'COPILOT',
  DeepSeek: 'DEEPSEEK',
  Doubao: 'DOUBAO',
  Gemini: 'GEMINI',
  'GitHub Copilot': 'GITHUB_COPILOT',
  Grok: 'GROK',
  HuggingChat: 'HUGGING_CHAT',
  Kimi: 'KIMI',
  Mistral: 'MISTRAL',
  'Meta AI': 'META',
  Arena: 'ARENA',
  'Open WebUI': 'OPEN_WEBUI',
  OpenRouter: 'OPENROUTER',
  Qwen: 'QWEN',
  Together: 'TOGETHER',
  Yuanbao: 'YUANBAO',
  Z: 'Z_AI'
}

export const MainView: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const is_landscape = use_is_landscape()
  const [is_content_scrollable, set_is_content_scrollable] = useState(false)

  const show_edit_format_selector =
    (props.target == 'WEB' && props.web_prompt_type == 'edit-files') ||
    (props.target == 'API' && props.api_prompt_type == 'edit-files') ||
    (props.target == 'CLI' && props.cli_prompt_type == 'edit-files')

  const is_context_empty =
    show_edit_format_selector && props.selected_files.length == 0

  const handle_input_change = (value: string) => {
    props.set_instructions(value)
  }

  const handle_submit = async () => {
    if (props.target == 'WEB') {
      props.initialize_chats({})
    } else if (props.target == 'API') {
      props.on_make_api_call(false)
    } else if (props.target == 'CLI') {
      props.on_invoke_agentic_cli(false)
    }
  }

  const handle_submit_with_control = async () => {
    if (props.target == 'WEB') {
      props.initialize_chats({
        show_quick_pick: true
      })
    } else if (props.target == 'API') {
      props.on_make_api_call(true)
    } else if (props.target == 'CLI') {
      props.on_invoke_agentic_cli(true)
    }
  }

  const last_choice_tooltip = use_last_choice_tooltip({
    target: props.target,
    selected_web_configuration_name: props.selected_web_configuration_name,
    web_configurations: props.web_configurations,
    selected_api_configuration_id: props.selected_api_configuration_id,
    api_configurations: props.api_configurations,
    selected_agent_configuration_name: props.selected_agent_configuration_name,
    agent_configurations: props.agent_configurations
  })

  const { is_alt_pressed } = use_keyboard_shortcuts({
    target: props.target,
    on_web_prompt_type_change: props.on_web_prompt_type_change,
    on_api_prompt_type_change: props.on_api_prompt_type_change,
    on_cli_prompt_type_change: props.on_cli_prompt_type_change,
    on_show_home: props.on_show_home,
    on_agentic_search: props.on_agentic_search,
    is_disabled: props.are_keyboard_shortcuts_disabled
  })

  const browser_connection = use_browser_connection_status(props.is_connected)

  const web_configurations: UiConfigurations.Configuration[] =
    props.web_configurations.map((web_configuration, index) => {
      const is_unnamed =
        !web_configuration.name ||
        /^\(\d+\)$/.test(web_configuration.name.trim())
      const display_name = is_unnamed
        ? web_configuration.chatbot!
        : web_configuration.name!.replace(/ \(\d+\)$/, '')

      const get_details = (): string[] => {
        const { chatbot, model, reasoning_effort } = web_configuration
        const model_display_name =
          model && chatbot
            ? CHATBOTS[chatbot].models?.[model]?.label || model
            : null

        const details: string[] = []
        if (is_unnamed) {
          if (model_display_name) details.push(model_display_name)
        } else if (model_display_name) {
          details.push(chatbot!, model_display_name)
        } else if (chatbot) {
          details.push(chatbot)
        }

        if (reasoning_effort) {
          details.push(reasoning_effort)
        }

        return details
      }

      return {
        id: web_configuration.name ?? `unnamed-${index}`,
        title: display_name,
        details: get_details(),
        is_pinned: web_configuration.is_pinned,
        icon: web_configuration.chatbot
          ? chatbot_to_icon[web_configuration.chatbot]
          : undefined
      }
    })

  const agent_configurations_ui: UiConfigurations.Configuration[] =
    props.agent_configurations.map((c, index) => {
      const is_unnamed = !c.name || /^\(\d+\)$/.test(c.name.trim())
      const display_name = is_unnamed
        ? c.agent!
        : c.name!.replace(/ \(\d+\)$/, '')

      const details: string[] = []
      if (is_unnamed) {
        if (c.flags) details.push(c.flags)
      } else if (c.agent) {
        details.push(c.agent)
        if (c.flags) details.push(c.flags)
      }

      return {
        id: c.name ?? `unnamed-${index}`,
        title: display_name,
        details,
        is_pinned: c.is_pinned
      }
    })

  const api_configurations_ui: UiConfigurations.Configuration[] =
    props.api_configurations.map((c) => {
      const details = [c.provider_name]
      if (c.reasoning_effort) {
        details.push(`${c.reasoning_effort}`)
      }
      return {
        id: c.id,
        title: c.model,
        details,
        is_pinned: c.is_pinned
      }
    })

  const is_api_warning_visible =
    props.target == 'API' &&
    !!props.setup_progress &&
    (!props.setup_progress.has_provider || props.api_configurations.length == 0)

  const header = (
    <Header
      target={props.target}
      on_show_home={props.on_show_home}
      web_prompt_type={props.web_prompt_type}
      on_web_prompt_type_change={props.on_web_prompt_type_change}
      api_prompt_type={props.api_prompt_type}
      on_api_prompt_type_change={props.on_api_prompt_type_change}
      cli_prompt_type={props.cli_prompt_type}
      on_cli_prompt_type_change={props.on_cli_prompt_type_change}
      is_alt_pressed={is_alt_pressed}
      is_landscape={is_landscape}
      is_browser_connection_status_bar_closed={browser_connection.is_closed}
      is_content_scrollable={is_content_scrollable}
      is_api_warning_visible={is_api_warning_visible}
      response_history={props.response_history}
    />
  )

  const prompt_attachments = (
    <PromptAttachments
      token_count={props.selected_files_token_count}
      files_count={props.selected_files.length}
      theme={
        props.target == 'WEB'
          ? props.web_prompt_type == 'edit-files'
            ? 'blue'
            : 'purple'
          : props.target == 'API'
            ? props.api_prompt_type == 'edit-files'
              ? 'blue'
              : 'purple'
            : props.cli_prompt_type == 'edit-files'
              ? 'blue'
              : 'purple'
      }
      is_alt_pressed={is_alt_pressed}
      on_agentic_search={props.on_agentic_search}
      translations={{
        attaching_file: t('selected-files.attaching-file'),
        attaching_files: t('selected-files.attaching-files'),
        agentic_search: t('selected-files.agentic-search')
      }}
    />
  )

  const prompt_section = (
    <>
      <UiSpacer height={is_landscape ? 6 : 2} />

      <BrowserConnectionStatus
        is_visible={props.target == 'WEB'}
        is_connected={props.is_connected}
        is_closed={browser_connection.is_closed}
        on_close={browser_connection.handle_close}
        on_install={props.on_install_browser_extension}
        translations={{
          connected: t('main.browser-connection.connected'),
          not_connected: t('main.browser-connection.not-connected'),
          install: t('main.browser-connection.install'),
          hide: t('main.browser-connection.hide')
        }}
      />

      {is_api_warning_visible && (
        <>
          <UiStatusBar
            theme="warning"
            icon="codicon-warning"
            label={t('configurations.setup-incomplete')}
            actions={[
              {
                id: 'settings',
                icon: 'codicon-gear',
                label: t('action.settings'),
                title: t('action.settings'),
                on_click: !props.setup_progress!.has_provider
                  ? props.on_manage_providers
                  : props.on_manage_models
              }
            ]}
          />
          <UiSpacer height={6} />
        </>
      )}

      {props.response_history.length > 0 &&
        (props.target == 'WEB'
          ? props.web_prompt_type
          : props.target == 'API'
            ? props.api_prompt_type
            : props.cli_prompt_type) == 'edit-files' && (
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
            translations={{
              applied_manually: t('common.applied-manually'),
              reject: t('action.reject')
            }}
          />
        )}

      <div className={styles.prompt}>
        <UiPromptField
          is_copy_only={
            props.target == 'WEB' &&
            (!props.is_connected || !props.web_configurations.length)
          }
          is_action_disabled={is_context_empty}
          value={props.instructions}
          chat_history={props.chat_history}
          on_change={handle_input_change}
          on_submit={handle_submit}
          on_submit_with_control={handle_submit_with_control}
          on_copy={props.on_copy}
          on_at_sign_click={props.on_at_sign_click}
          on_hash_sign_click={props.on_hash_sign_click}
          on_slash_click={props.on_slash_click}
          is_web_target={props.target == 'WEB'}
          is_connected={props.is_connected}
          current_selection={props.current_selection}
          send_with_shift_enter={props.send_with_shift_enter}
          currently_open_file_text={props.currently_open_file_text}
          on_caret_position_change={props.on_caret_position_change}
          caret_position_to_set={props.caret_position_to_set}
          prompt_token_count={
            (props.target == 'WEB'
              ? props.web_prompt_type
              : props.target == 'API'
                ? props.api_prompt_type
                : props.cli_prompt_type) == 'edit-files'
              ? props.edit_instructions_token_count
              : props.ask_instructions_token_count
          }
          on_caret_position_set={props.on_caret_position_set}
          focus_and_select_key={props.chat_input_focus_and_select_key}
          focus_key={props.chat_input_focus_key}
          last_choice_tooltip={last_choice_tooltip}
          show_edit_format_selector={show_edit_format_selector}
          edit_format={props.edit_format}
          on_edit_format_change={props.on_edit_format_change}
          selected_files={props.selected_files}
          on_go_to_file={props.on_go_to_file}
          on_pasted_lines_click={props.on_pasted_lines_click}
          on_open_url={props.on_open_url}
          on_open_website={props.on_open_website}
          target={props.target}
          on_target_change={(target) => props.on_target_change(target)}
          active_border_color={
            is_context_empty
              ? 'yellow'
              : props.target == 'WEB'
                ? props.web_prompt_type == 'edit-files'
                  ? 'blue'
                  : 'purple'
                : props.target == 'API'
                  ? props.api_prompt_type == 'edit-files'
                    ? 'blue'
                    : 'purple'
                  : props.cli_prompt_type == 'edit-files'
                    ? 'blue'
                    : 'purple'
          }
          on_paste_image={props.on_paste_image}
          on_open_image={props.on_open_image}
          on_paste_long_text={props.on_paste_long_text}
          on_open_pasted_text={props.on_open_pasted_text}
          on_paste_url={props.on_paste_url}
          on_changes_click={props.on_changes_click}
          on_commit_click={props.on_commit_click}
          on_skill_click={props.on_skill_click}
          on_preview_prompt={props.on_preview_prompt}
          is_recording={props.is_recording}
          on_recording_started={props.on_recording_started}
          on_recording_finished={props.on_recording_finished}
          tabs_count={props.tabs_count}
          active_tab_index={props.active_tab_index}
          on_tab_change={props.on_tab_change}
          on_new_tab={props.on_new_tab}
          on_tab_delete={props.on_tab_delete}
          on_tabs_reorder={props.on_tabs_reorder}
          voice_input_push_to_talk={props.voice_input_push_to_talk}
          currently_open_file_path={props.currently_open_file_path}
          translations={{
            voice_input: t('prompt-field.voice-input'),
            stop_recording: t('prompt-field.stop-recording'),
            reference_file: t('prompt-field.reference-file'),
            insert_symbol: t('prompt-field.insert-symbol'),
            use_template: t('prompt-field.use-template'),
            edit_format: t('prompt-field.edit-format'),
            edit_format_whole: t('prompt-field.edit-format.whole'),
            edit_format_search_replace: t(
              'prompt-field.edit-format.search-replace'
            ),
            edit_format_diff: t('prompt-field.edit-format.diff'),
            edit_format_truncated: t('prompt-field.edit-format.truncated'),
            placeholder_code_history: t(
              'prompt-field.placeholder.code-history'
            ),
            placeholder_code: t('prompt-field.placeholder.code'),
            placeholder_history: t('prompt-field.placeholder.history'),
            placeholder_default: t('prompt-field.placeholder.default'),
            send_with: t('prompt-field.action.send-with'),
            send_with_ellipsis: t('prompt-field.action.send-with-ellipsis'),
            copy_prompt: t('prompt-field.action.copy-prompt'),
            preview_prompt: t('prompt-field.action.preview-prompt'),
            send: t('prompt-field.action.send'),
            attach_selected_files: t('prompt-field.attach-selected-files'),
            target: t('prompt-field.target'),
            more: t('prompt-field.more')
          }}
        />
      </div>

      {is_context_empty ? (
        <UiStatusBar
          placement="bottom"
          theme="warning"
          icon="codicon-warning"
          label={t('common.context-is-empty')}
          actions={[
            {
              id: 'agentic-search',
              icon: 'codicon-search-sparkle',
              label: t('selected-files.agentic-search'),
              keycap: is_alt_pressed ? 'F' : undefined,
              on_click: props.on_agentic_search
            }
          ]}
        />
      ) : (
        prompt_attachments
      )}

      {is_landscape && <UiSpacer height={6} />}
    </>
  )

  const configurations_placeholder_above = (
    <>
      {props.target == 'WEB' && (
        <>
          {!browser_connection.is_closed && (
            <>
              <UiStatusBar
                icon="codicon-debug-disconnect"
                label=""
                actions={[
                  {
                    id: 'install',
                    icon: 'codicon-add',
                    label: '',
                    title: '',
                    on_click: () => {}
                  }
                ]}
              />
              <UiSpacer height={6} />
            </>
          )}
          {props.response_history.length > 0 &&
            props.web_prompt_type === 'edit-files' && (
              <UiResponses
                response_history={props.response_history}
                on_response_history_item_click={() => {}}
                on_selected_history_item_change={() => {}}
                on_response_history_item_remove={() => {}}
                translations={{
                  applied_manually: '',
                  reject: ''
                }}
              />
            )}
        </>
      )}
      {props.target == 'API' && (
        <>
          {is_api_warning_visible && (
            <>
              <UiStatusBar
                icon="codicon-warning"
                label=""
                actions={[
                  {
                    id: 'settings',
                    icon: 'codicon-gear',
                    label: '',
                    title: '',
                    on_click: () => {}
                  }
                ]}
              />
              <UiSpacer height={6} />
            </>
          )}
          {props.response_history.length > 0 &&
            props.api_prompt_type === 'edit-files' && (
              <UiResponses
                response_history={props.response_history}
                on_response_history_item_click={() => {}}
                on_selected_history_item_change={() => {}}
                on_response_history_item_remove={() => {}}
                translations={{
                  applied_manually: '',
                  reject: ''
                }}
              />
            )}
        </>
      )}
      {props.target == 'CLI' && (
        <>
          {props.response_history.length > 0 &&
            props.cli_prompt_type === 'edit-files' && (
              <UiResponses
                response_history={props.response_history}
                on_response_history_item_click={() => {}}
                on_selected_history_item_change={() => {}}
                on_response_history_item_remove={() => {}}
                translations={{
                  applied_manually: '',
                  reject: ''
                }}
              />
            )}
        </>
      )}
    </>
  )

  const configurations_placeholder_below = (
    <>
      {props.target == 'WEB' && !browser_connection.is_closed && (
        <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          {prompt_attachments}
        </div>
      )}
    </>
  )

  const configurations_section = (
    <>
      {props.target == 'WEB' && (
        <UiConfigurations
          configurations={web_configurations}
          empty_landscape_placeholder_above={configurations_placeholder_above}
          on_create={(params) => {
            props.on_create_web_configuration(params)
          }}
          on_configuration_click={(id) => {
            props.initialize_chats({
              web_configuration_name: id,
              show_quick_pick: false
            })
          }}
          on_edit={(id) => props.on_web_configuration_edit(id)}
          on_reorder={(reordered) => {
            const new_web_configurations = reordered.map((c) => {
              return props.web_configurations.find(
                (p, i) => (p.name ?? `unnamed-${i}`) == c.id
              )!
            })
            props.on_web_configurations_reorder(new_web_configurations)
          }}
          on_delete={(id) => {
            props.on_delete_web_configuration(id)
          }}
          on_toggle_pinned={(id) => {
            props.on_toggle_web_configuration_pinned(id)
          }}
          selected_configuration_id={props.selected_web_configuration_name}
          translations={{
            empty: t('chatbots.empty'),
            add_new: t('action.add-new'),
            pin: t('action.pin'),
            unpin: t('action.unpin'),
            insert: t('action.insert'),
            edit: t('action.edit'),
            delete: t('action.delete')
          }}
        />
      )}

      {props.target == 'API' && (
        <UiConfigurations
          configurations={api_configurations_ui}
          on_configuration_click={props.on_api_configuration_click}
          on_reorder={(reordered) =>
            props.on_api_configurations_reorder(reordered)
          }
          on_toggle_pinned={props.on_toggle_pinned_api_configuration}
          on_edit={props.on_edit_api_configuration}
          on_delete={props.on_delete_api_configuration}
          selected_configuration_id={props.selected_api_configuration_id}
          on_create={props.on_create_api_configuration}
          empty_landscape_placeholder_above={configurations_placeholder_above}
          empty_landscape_placeholder_below={configurations_placeholder_below}
          translations={{
            empty: t('configurations.empty'),
            add_new: t('action.add-new'),
            pin: t('action.pin'),
            unpin: t('action.unpin'),
            insert: t('action.insert'),
            edit: t('action.edit'),
            delete: t('action.delete')
          }}
        />
      )}

      {props.target == 'CLI' && (
        <UiConfigurations
          configurations={agent_configurations_ui}
          empty_landscape_placeholder_above={configurations_placeholder_above}
          on_create={(params) => {
            props.on_create_agent_configuration(params)
          }}
          on_configuration_click={(id) => {
            props.on_agent_configuration_click(id)
          }}
          on_edit={(id) => props.on_edit_agent_configuration(id)}
          on_reorder={(reordered) => {
            const new_agent_configurations = reordered.map((c) => {
              return props.agent_configurations.find(
                (p, i) => (p.name ?? `unnamed-${i}`) == c.id
              )!
            })
            props.on_agent_configurations_reorder(new_agent_configurations)
          }}
          on_delete={(id) => {
            props.on_delete_agent_configuration(id)
          }}
          on_toggle_pinned={(id) => {
            props.on_toggle_pinned_agent_configuration(id)
          }}
          selected_configuration_id={props.selected_agent_configuration_name}
          translations={{
            empty: t('agents.empty'),
            add_new: t('action.add-new'),
            pin: t('action.pin'),
            unpin: t('action.unpin'),
            insert: t('action.insert'),
            edit: t('action.edit'),
            delete: t('action.delete')
          }}
        />
      )}
    </>
  )

  if (is_landscape) {
    return (
      <div className={styles.landscape}>
        <div
          className={`${styles.landscape__column} ${styles['landscape__column--header']}`}
        >
          {header}
        </div>
        <div
          className={`${styles.landscape__column} ${styles['landscape__column--prompt']}`}
        >
          <UiScrollable
            scroll_to_top_key={props.scroll_reset_key}
            top_shadow
            on_scrollable_change={set_is_content_scrollable}
          >
            <div className={styles.content}>{prompt_section}</div>
          </UiScrollable>
        </div>
        <div
          className={`${styles.landscape__column} ${styles['landscape__column--configurations']}`}
        >
          <UiScrollable scroll_to_top_key={props.scroll_reset_key} top_shadow>
            <div className={styles.content}>
              <UiSpacer height={6} />
              {configurations_section}
              <UiSpacer height={12} />
            </div>
          </UiScrollable>
        </div>
      </div>
    )
  }

  return (
    <>
      {header}
      <UiScrollable
        scroll_to_top_key={props.scroll_reset_key}
        top_shadow
        on_scrollable_change={set_is_content_scrollable}
      >
        <div className={styles.content}>
          {prompt_section}

          <UiSpacer height={6} />

          {configurations_section}
          <UiSpacer height={12} />
        </div>
      </UiScrollable>
    </>
  )
}
