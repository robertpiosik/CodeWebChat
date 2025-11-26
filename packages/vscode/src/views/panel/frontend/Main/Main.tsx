import { useEffect, useState } from 'react'
import { MainView } from './MainView'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import {
  MODE,
  Mode
} from '@/views/panel/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import {
  BackendMessage,
  ApiToolConfigurationsMessage,
  PresetsMessage,
  FrontendMessage
} from '@/views/panel/types/messages'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { post_message } from '../utils/post_message'
import { Configurations as UiConfigurations } from '@ui/components/editor/panel/Configurations'
import { ResponseHistoryItem } from '@shared/types/response-history-item'

type Props = {
  scroll_reset_key: number
  response_history: ResponseHistoryItem[]
  selected_history_item_created_at?: number
  on_selected_history_item_change: (created_at: number) => void
  on_response_history_item_click: (item: ResponseHistoryItem) => void
  on_response_history_item_remove: (created_at: number) => void
  vscode: any
  on_preset_edit: (preset: Preset) => void
  on_show_home: () => void
  is_connected: boolean
  ask_instructions: string
  edit_instructions: string
  no_context_instructions: string
  code_completions_instructions: string
  set_instructions: (
    value: string,
    mode: 'ask' | 'edit-context' | 'no-context' | 'code-completions'
  ) => void
  mode: Mode
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_mode_change: (mode: Mode) => void
  on_web_prompt_type_change: (mode: WebPromptType) => void
  on_api_prompt_type_change: (mode: ApiPromptType) => void
  has_active_editor: boolean
  has_active_selection: boolean
  chat_input_focus_and_select_key: number
  chat_input_focus_key: number
  context_size_warning_threshold: number
  context_file_paths: string[]
  presets_collapsed: boolean
  on_presets_collapsed_change: (is_collapsed: boolean) => void
  configurations_collapsed: boolean
  on_configurations_collapsed_change: (is_collapsed: boolean) => void
  currently_open_file_text?: string
}

export const Main: React.FC<Props> = (props) => {
  const [all_presets, set_all_presets] = useState<{
    [T in WebPromptType]: Preset[]
  }>()
  const [
    selected_preset_or_group_name_by_mode,
    set_selected_preset_or_group_name_by_mode
  ] = useState<{ [T in WebPromptType]?: string }>()
  const [all_configurations, set_all_configurations] = useState<{
    [T in ApiPromptType]?: ApiToolConfiguration[]
  }>()
  const [
    selected_configuration_id_by_mode,
    set_selected_configuration_id_by_mode
  ] = useState<{ [T in ApiPromptType]?: string }>()
  const [ask_history, set_ask_history] = useState<string[]>()
  const [edit_history, set_edit_history] = useState<string[]>()
  const [no_context_history, set_no_context_history] = useState<string[]>()
  const [code_completions_history, set_code_completions_history] =
    useState<string[]>()
  const [token_count, set_token_count] = useState<number>(0)
  const [chat_edit_format, set_chat_edit_format] = useState<EditFormat>()
  const [edit_format_instructions, set_edit_format_instructions] =
    useState<Record<EditFormat, string>>()
  const [api_edit_format, set_api_edit_format] = useState<EditFormat>()
  const [caret_position_to_set, set_caret_position_to_set] = useState<
    number | undefined
  >()

  const is_in_code_completions_mode =
    (props.mode == MODE.WEB && props.web_prompt_type == 'code-completions') ||
    (props.mode == MODE.API && props.api_prompt_type == 'code-completions')

  useEffect(() => {
    const handle_message = async (event: MessageEvent) => {
      const message = event.data as BackendMessage
      switch (message.command) {
        case 'PRESETS':
          set_all_presets((message as PresetsMessage).presets)
          set_selected_preset_or_group_name_by_mode(
            (message as PresetsMessage).selected_preset_or_group_name_by_mode
          )
          set_selected_configuration_id_by_mode(
            (message as PresetsMessage).selected_configuration_id_by_mode
          )
          break
        case 'API_TOOL_CONFIGURATIONS':
          set_all_configurations(
            (message as ApiToolConfigurationsMessage).configurations
          )
          break
        case 'CHAT_HISTORY':
          set_ask_history(message.ask || [])
          set_edit_history(message.edit_context || [])
          set_no_context_history(message.no_context || [])
          set_code_completions_history(message.code_completions || [])
          break
        case 'TOKEN_COUNT_UPDATED':
          set_token_count(message.token_count)
          break
        case 'PRESET_CREATED':
          props.on_preset_edit(message.preset)
          break
        case 'INSTRUCTIONS':
          if (message.ask !== undefined)
            props.set_instructions(message.ask, 'ask')
          if (message.edit_context !== undefined)
            props.set_instructions(message.edit_context, 'edit-context')
          if (message.no_context !== undefined)
            props.set_instructions(message.no_context, 'no-context')
          if (message.code_completions !== undefined)
            props.set_instructions(message.code_completions, 'code-completions')
          if (
            message.caret_position !== undefined &&
            message.caret_position >= 0
          )
            set_caret_position_to_set(message.caret_position)
          break
        case 'EDIT_FORMAT':
          set_chat_edit_format(message.chat_edit_format)
          set_api_edit_format(message.api_edit_format)
          break
        case 'EDIT_FORMAT_INSTRUCTIONS':
          set_edit_format_instructions(message.instructions)
          break
        case 'SELECTED_PRESET_OR_GROUP_CHANGED':
          set_selected_preset_or_group_name_by_mode((prev) => ({
            ...prev,
            [message.mode]: message.name
          }))
          break
        case 'SELECTED_CONFIGURATION_CHANGED':
          set_selected_configuration_id_by_mode((prev) => ({
            ...prev,
            [message.mode]: message.id
          }))
          break
      }
    }

    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'GET_PRESETS' },
      { command: 'GET_HISTORY' },
      { command: 'GET_CURRENT_TOKEN_COUNT' },
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_EDIT_FORMAT' },
      { command: 'GET_EDIT_FORMAT_INSTRUCTIONS' },
      { command: 'GET_API_TOOL_CONFIGURATIONS' }
    ]
    initial_messages.forEach((message) => post_message(props.vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const current_prompt_type =
    props.mode == MODE.WEB ? props.web_prompt_type : props.api_prompt_type

  const update_chat_history = (instruction: string) => {
    if (!instruction.trim()) {
      return
    }

    if (!current_prompt_type) return

    let history: string[] | undefined
    let set_history: React.Dispatch<React.SetStateAction<string[] | undefined>>

    if (current_prompt_type == 'ask') {
      history = ask_history
      set_history = set_ask_history
    } else if (current_prompt_type == 'edit-context') {
      history = edit_history
      set_history = set_edit_history
    } else if (current_prompt_type == 'no-context') {
      history = no_context_history
      set_history = set_no_context_history
    } else if (current_prompt_type == 'code-completions') {
      history = code_completions_history
      set_history = set_code_completions_history
    } else {
      return
    }

    const is_duplicate =
      history && history.length > 0 && history[0] === instruction

    if (!is_duplicate) {
      const new_history = [instruction, ...(history || [])].slice(0, 100)
      set_history(new_history)

      post_message(props.vscode, {
        command: 'SAVE_HISTORY',
        messages: new_history,
        mode: current_prompt_type
      })
    }
  }

  const handle_toggle_selected_preset = (name: string) => {
    if (all_presets) {
      const presets_for_current_mode = all_presets[props.web_prompt_type]
      const updated_presets = presets_for_current_mode.map((p) =>
        p.name == name ? { ...p, is_selected: !p.is_selected } : p
      )

      set_all_presets({
        ...all_presets,
        [props.web_prompt_type]: updated_presets
      })

      post_message(props.vscode, {
        command: 'REPLACE_PRESETS',
        presets: updated_presets.map((preset) => ({
          name: preset.name,
          chatbot: preset.chatbot,
          prompt_prefix: preset.prompt_prefix,
          prompt_suffix: preset.prompt_suffix,
          model: preset.model,
          temperature: preset.temperature,
          top_p: preset.top_p,
          thinking_budget: preset.thinking_budget,
          reasoning_effort: preset.reasoning_effort,
          system_instructions: preset.system_instructions,
          options: preset.options,
          port: preset.port,
          is_selected: preset.is_selected || undefined,
          is_collapsed: preset.is_collapsed || undefined,
          is_pinned: preset.is_pinned || undefined
        }))
      })
    }
  }

  const handle_toggle_preset_pinned = (name: string) => {
    if (all_presets) {
      const presets_for_current_mode = all_presets[props.web_prompt_type]
      const updated_presets = presets_for_current_mode.map((p) =>
        p.name == name ? { ...p, is_pinned: !p.is_pinned } : p
      )

      set_all_presets({
        ...all_presets,
        [props.web_prompt_type]: updated_presets
      })

      post_message(props.vscode, {
        command: 'REPLACE_PRESETS',
        presets: updated_presets.map((preset) => ({
          name: preset.name,
          chatbot: preset.chatbot,
          prompt_prefix: preset.prompt_prefix,
          prompt_suffix: preset.prompt_suffix,
          model: preset.model,
          temperature: preset.temperature,
          top_p: preset.top_p,
          thinking_budget: preset.thinking_budget,
          reasoning_effort: preset.reasoning_effort,
          system_instructions: preset.system_instructions,
          options: preset.options,
          port: preset.port,
          is_selected: preset.is_selected || undefined,
          is_collapsed: preset.is_collapsed || undefined,
          is_pinned: preset.is_pinned || undefined
        }))
      })
    }
  }

  const handle_toggle_group_collapsed = (name: string) => {
    if (all_presets) {
      const presets_for_current_mode = all_presets[props.web_prompt_type]
      const updated_presets = presets_for_current_mode.map((p) =>
        p.name == name ? { ...p, is_collapsed: !p.is_collapsed } : p
      )

      set_all_presets({
        ...all_presets,
        [props.web_prompt_type]: updated_presets
      })

      post_message(props.vscode, {
        command: 'REPLACE_PRESETS',
        presets: updated_presets.map((preset) => ({
          name: preset.name,
          chatbot: preset.chatbot,
          prompt_prefix: preset.prompt_prefix,
          prompt_suffix: preset.prompt_suffix,
          model: preset.model,
          temperature: preset.temperature,
          top_p: preset.top_p,
          thinking_budget: preset.thinking_budget,
          reasoning_effort: preset.reasoning_effort,
          system_instructions: preset.system_instructions,
          options: preset.options,
          port: preset.port,
          is_selected: preset.is_selected || undefined,
          is_collapsed: preset.is_collapsed || undefined,
          is_pinned: preset.is_pinned || undefined
        }))
      })
    }
  }

  const handle_initialize_chats = (params: {
    preset_name?: string
    group_name?: string
    show_quick_pick?: boolean
    without_submission?: boolean
  }) => {
    post_message(props.vscode, {
      command: 'SEND_PROMPT',
      preset_name: params.preset_name,
      group_name: params.group_name,
      show_quick_pick: params.show_quick_pick,
      without_submission: params.without_submission
    })

    if (!params.without_submission) {
      update_chat_history(instructions)
    }
  }

  const handle_copy_to_clipboard = (preset_name?: string) => {
    post_message(props.vscode, {
      command: 'COPY_PROMPT',
      instructions,
      preset_name
    })

    if (instructions.trim()) {
      update_chat_history(instructions)
    }
  }

  const handle_presets_reorder = (reordered_presets: Preset[]) => {
    if (all_presets) {
      set_all_presets({ ...all_presets, [current_prompt_type]: reordered_presets })
    }

    post_message(props.vscode, {
      command: 'REPLACE_PRESETS',
      presets: reordered_presets.map((preset) => ({
        name: preset.name,
        chatbot: preset.chatbot,
        prompt_prefix: preset.prompt_prefix,
        prompt_suffix: preset.prompt_suffix,
        model: preset.model,
        temperature: preset.temperature,
        top_p: preset.top_p,
        thinking_budget: preset.thinking_budget,
        reasoning_effort: preset.reasoning_effort,
        system_instructions: preset.system_instructions,
        options: preset.options,
        port: preset.port,
        is_selected: preset.is_selected,
        is_collapsed: preset.is_collapsed,
        is_pinned: preset.is_pinned
      }))
    })
  }

  const handle_manage_configurations = () => {
    post_message(props.vscode, {
      command: 'MANAGE_CONFIGURATIONS',
      api_prompt_type: props.api_prompt_type
    })
  }

  const handle_configurations_reorder = (
    reordered_configs: (UiConfigurations.Configuration & { id: string })[]
  ) => {
    if (all_configurations && props.api_prompt_type) {
      const current_api_configs = all_configurations[props.api_prompt_type]
      if (!current_api_configs) return

      const reordered_api_tool_configs = reordered_configs
        .map((ui_config) => {
          return current_api_configs.find((c) => c.id === ui_config.id)!
        })
        .filter(Boolean)

      if (reordered_api_tool_configs.length !== current_api_configs.length) {
        return
      }

      set_all_configurations({
        ...all_configurations,
        [props.api_prompt_type]: reordered_api_tool_configs
      })

      post_message(props.vscode, {
        command: 'REORDER_API_TOOL_CONFIGURATIONS',
        mode: props.api_prompt_type,
        configurations: reordered_api_tool_configs
      })
    }
  }

  const handle_toggle_pinned_configuration = (id: string) => {
    if (props.api_prompt_type) {
      post_message(props.vscode, {
        command: 'TOGGLE_PINNED_API_TOOL_CONFIGURATION',
        mode: props.api_prompt_type,
        configuration_id: id
      })
    }
  }

  const handle_create_preset = (options?: { add_on_top?: boolean }) => {
    post_message(props.vscode, {
      command: 'CREATE_PRESET',
      add_on_top: options?.add_on_top
    })
  }

  const handle_create_separator = (options?: { create_on_index?: number }) => {
    post_message(props.vscode, {
      command: 'CREATE_SEPARATOR',
      ...options
    })
  }

  const handle_create_group = (options?: {
    add_on_top?: boolean
    instant?: boolean
    create_on_index?: number
    move_preset_with_name_after?: string
  }) => {
    post_message(props.vscode, {
      command: 'CREATE_GROUP',
      add_on_top: options?.add_on_top,
      instant: options?.instant,
      create_on_index: options?.create_on_index,
      move_preset_with_name_after: options?.move_preset_with_name_after
    })
  }

  const handle_preset_edit = (name: string) => {
    const current_presets = all_presets
      ? all_presets[props.web_prompt_type]
      : []
    const preset = current_presets.find((preset) => preset.name == name)
    if (preset) props.on_preset_edit(preset)
  }

  const handle_preset_duplicate = (index: number) => {
    post_message(props.vscode, {
      command: 'DUPLICATE_PRESET',
      index
    })
  }

  const handle_group_delete = (index: number) => {
    post_message(props.vscode, {
      command: 'DELETE_GROUP',
      index
    })
  }

  const handle_separator_delete = (index: number) => {
    post_message(props.vscode, {
      command: 'DELETE_SEPARATOR',
      index
    })
  }

  const handle_preset_delete = (index: number) => {
    post_message(props.vscode, {
      command: 'DELETE_PRESET',
      index
    })
  }

  const handle_chat_edit_format_change = (edit_format: EditFormat) => {
    set_chat_edit_format(edit_format)
    post_message(props.vscode, {
      command: 'SAVE_EDIT_FORMAT',
      target: 'chat',
      edit_format
    })
  }

  const handle_api_edit_format_change = (edit_format: EditFormat) => {
    set_api_edit_format(edit_format)
    post_message(props.vscode, {
      command: 'SAVE_EDIT_FORMAT',
      target: 'api',
      edit_format
    })
  }

  const handle_caret_position_change = (caret_position: number) => {
    post_message(props.vscode, {
      command: 'CARET_POSITION_CHANGED',
      caret_position
    })
  }

  const get_current_instructions = () => {
    if (is_in_code_completions_mode) {
      return props.code_completions_instructions
    }
    if (current_prompt_type == 'ask') return props.ask_instructions
    if (current_prompt_type == 'edit-context') return props.edit_instructions
    if (current_prompt_type == 'no-context') return props.no_context_instructions
    return ''
  }

  const handle_edit_context_click = () => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'EDIT_CONTEXT',
      use_quick_pick: false
    })

    update_chat_history(instruction)
  }

  const handle_edit_context_with_quick_pick_click = () => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'EDIT_CONTEXT',
      use_quick_pick: true
    })

    update_chat_history(instruction)
  }

  const handle_code_completion_click = () => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'CODE_COMPLETION',
      use_quick_pick: false
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_code_completion_with_quick_pick_click = () => {
    const instruction = get_current_instructions()

    post_message(props.vscode, {
      command: 'CODE_COMPLETION',
      use_quick_pick: true
    })

    if (instruction.trim()) {
      update_chat_history(instruction)
    }
  }

  const handle_at_sign_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_AT_SIGN_QUICK_PICK',
      is_for_code_completions: is_in_code_completions_mode
    })
  }

  const handle_hash_sign_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_HASH_SIGN_QUICK_PICK',
      is_for_code_completions: is_in_code_completions_mode
    })
  }

  const handle_curly_braces_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_PROMPT_TEMPLATE_QUICK_PICK'
    })
  }

  const handle_search_click = () => {
    post_message(props.vscode, {
      command: 'SHOW_HISTORY_QUICK_PICK'
    })
  }

  const handle_configuration_click = (id: string) => {
    const instruction = get_current_instructions()

    if (props.api_prompt_type == 'edit-context') {
      post_message(props.vscode, {
        command: 'EDIT_CONTEXT',
        use_quick_pick: false,
        config_id: id
      })
    } else if (props.api_prompt_type == 'code-completions') {
      post_message(props.vscode, {
        command: 'CODE_COMPLETION',
        use_quick_pick: false,
        config_id: id
      })
    }

    update_chat_history(instruction)
  }

  const handle_quick_action_click = (command: string) => {
    post_message(props.vscode, {
      command: 'EXECUTE_COMMAND',
      command_id: command
    })
  }

  const handle_go_to_file = (file_path: string) => {
    post_message(props.vscode, {
      command: 'GO_TO_FILE',
      file_path
    })
  }

  const instructions =
    current_prompt_type == 'ask'
      ? props.ask_instructions
      : current_prompt_type == 'edit-context'
      ? props.edit_instructions
      : current_prompt_type == 'no-context'
      ? props.no_context_instructions
      : current_prompt_type == 'code-completions'
      ? props.code_completions_instructions
      : ''

  const set_instructions = (value: string) => {
    props.set_instructions(value, current_prompt_type)
  }

  let current_history: string[] | undefined
  if (current_prompt_type == 'ask') {
    current_history = ask_history
  } else if (current_prompt_type == 'edit-context') {
    current_history = edit_history
  } else if (current_prompt_type == 'no-context') {
    current_history = no_context_history
  } else if (current_prompt_type == 'code-completions') {
    current_history = code_completions_history
  }

  if (
    all_presets === undefined ||
    all_configurations === undefined ||
    ask_history === undefined ||
    edit_history === undefined ||
    no_context_history === undefined ||
    code_completions_history === undefined ||
    is_in_code_completions_mode === undefined ||
    instructions === undefined ||
    chat_edit_format === undefined ||
    api_edit_format === undefined ||
    edit_format_instructions === undefined
  ) {
    return <></>
  }

  const presets_for_current_mode = all_presets[props.web_prompt_type]

  const selected_preset_or_group_name =
    selected_preset_or_group_name_by_mode?.[props.web_prompt_type]

  const configurations_for_current_mode =
    all_configurations && props.mode == MODE.API
      ? all_configurations[props.api_prompt_type]
      : []

  return (
    <MainView
      scroll_reset_key={props.scroll_reset_key}
      on_show_home={props.on_show_home}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      configurations={configurations_for_current_mode || []}
      on_configuration_click={handle_configuration_click}
      on_configurations_reorder={handle_configurations_reorder}
      on_toggle_pinned_configuration={handle_toggle_pinned_configuration}
      on_manage_configurations={handle_manage_configurations}
      on_search_click={handle_search_click}
      on_at_sign_click={handle_at_sign_click}
      on_hash_sign_click={handle_hash_sign_click}
      on_curly_braces_click={handle_curly_braces_click}
      is_connected={props.is_connected}
      presets={presets_for_current_mode}
      on_create_preset={handle_create_preset}
      on_create_group={handle_create_group}
      on_create_separator={handle_create_separator}
      on_quick_action_click={handle_quick_action_click}
      has_active_editor={props.has_active_editor}
      has_active_selection={props.has_active_selection}
      chat_history={current_history || []}
      token_count={token_count}
      web_prompt_type={props.web_prompt_type}
      api_prompt_type={props.api_prompt_type}
      context_size_warning_threshold={props.context_size_warning_threshold}
      on_web_prompt_type_change={props.on_web_prompt_type_change}
      on_api_prompt_type_change={props.on_api_prompt_type_change}
      chat_edit_format={chat_edit_format}
      api_edit_format={api_edit_format}
      edit_format_instructions={edit_format_instructions}
      on_chat_edit_format_change={handle_chat_edit_format_change}
      on_api_edit_format_change={handle_api_edit_format_change}
      on_presets_reorder={handle_presets_reorder}
      on_preset_edit={handle_preset_edit}
      on_preset_duplicate={handle_preset_duplicate}
      on_preset_delete={handle_preset_delete}
      on_group_delete={handle_group_delete}
      on_separator_delete={handle_separator_delete}
      on_toggle_selected_preset={handle_toggle_selected_preset}
      on_toggle_preset_pinned={handle_toggle_preset_pinned}
      on_toggle_group_collapsed={handle_toggle_group_collapsed}
      selected_preset_or_group_name={selected_preset_or_group_name}
      selected_configuration_id={
        selected_configuration_id_by_mode?.[props.api_prompt_type]
      }
      instructions={instructions}
      set_instructions={set_instructions}
      on_caret_position_change={handle_caret_position_change}
      mode={props.mode}
      on_mode_change={props.on_mode_change}
      on_edit_context_click={handle_edit_context_click}
      on_edit_context_with_quick_pick_click={
        handle_edit_context_with_quick_pick_click
      }
      on_code_completion_click={handle_code_completion_click}
      on_code_completion_with_quick_pick_click={
        handle_code_completion_with_quick_pick_click
      }
      caret_position_to_set={caret_position_to_set}
      on_caret_position_set={() => set_caret_position_to_set(undefined)}
      chat_input_focus_and_select_key={props.chat_input_focus_and_select_key}
      chat_input_focus_key={props.chat_input_focus_key}
      response_history={props.response_history}
      on_response_history_item_click={props.on_response_history_item_click}
      selected_history_item_created_at={props.selected_history_item_created_at}
      on_selected_history_item_change={props.on_selected_history_item_change}
      on_response_history_item_remove={
        props.on_response_history_item_remove
      }
      context_file_paths={props.context_file_paths}
      presets_collapsed={props.presets_collapsed}
      on_presets_collapsed_change={props.on_presets_collapsed_change}
      configurations_collapsed={props.configurations_collapsed}
      on_configurations_collapsed_change={
        props.on_configurations_collapsed_change
      }
      on_go_to_file={handle_go_to_file}
      currently_open_file_text={props.currently_open_file_text}
    />
  )
}
