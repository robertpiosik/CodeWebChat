import { useEffect, useState } from 'react'
import { HomeView } from './HomeView'
import { Preset } from '@shared/types/preset'
import { EditFormat } from '@shared/types/edit-format'
import { HOME_VIEW_TYPES, HomeViewType } from '@/view/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import {
  BackendMessage,
  ApiToolConfigurationsMessage,
  PresetsMessage,
  FrontendMessage
} from '@/view/types/messages'
import { ApiToolConfiguration } from '@/view/types/messages'
import { post_message } from '../utils/post_message'

type Props = {
  vscode: any
  on_preset_edit: (preset: Preset) => void
  on_show_intro: () => void
  is_connected: boolean
  ask_instructions: string
  edit_instructions: string
  no_context_instructions: string
  code_completions_instructions: string
  set_instructions: (
    value: string,
    mode: 'ask' | 'edit-context' | 'no-context' | 'code-completions'
  ) => void
  home_view_type: HomeViewType
  web_mode: WebMode
  api_mode: ApiMode
  on_home_view_type_change: (view_type: HomeViewType) => void
  on_web_mode_change: (mode: WebMode) => void
  on_api_mode_change: (mode: ApiMode) => void
  has_active_editor: boolean
  has_active_selection: boolean
}

export const Home: React.FC<Props> = (props) => {
  const [all_presets, set_all_presets] = useState<{
    [T in WebMode]: Preset[]
  }>()
  const [all_configurations, set_all_configurations] = useState<{
    [T in ApiMode]?: ApiToolConfiguration[]
  }>()
  const [ask_history, set_ask_history] = useState<string[]>()
  const [edit_history, set_edit_history] = useState<string[]>()
  const [no_context_history, set_no_context_history] = useState<string[]>()
  const [code_completions_history, set_code_completions_history] =
    useState<string[]>()
  const [token_count, set_token_count] = useState<number>(0)
  const [selection_text, set_selection_text] = useState<string>('')
  const [chat_edit_format, set_chat_edit_format] = useState<EditFormat>()
  const [api_edit_format, set_api_edit_format] = useState<EditFormat>()
  const [caret_position_to_set, set_caret_position_to_set] = useState<
    number | undefined
  >()
  const [is_focused, set_is_focused] = useState<Date | undefined>(undefined)

  const is_in_code_completions_mode =
    (props.home_view_type == HOME_VIEW_TYPES.WEB &&
      props.web_mode == 'code-completions') ||
    (props.home_view_type == HOME_VIEW_TYPES.API &&
      props.api_mode == 'code-completions')

  useEffect(() => {
    const handle_message = async (event: MessageEvent) => {
      const message = event.data as BackendMessage
      switch (message.command) {
        case 'PRESETS':
          set_all_presets((message as PresetsMessage).presets)
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
        case 'SELECTION_TEXT_UPDATED':
          set_selection_text(message.text)
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
        case 'FOCUS_CHAT_INPUT':
          set_is_focused(new Date())
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
      { command: 'GET_API_TOOL_CONFIGURATIONS' }
    ]
    initial_messages.forEach((message) => post_message(props.vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const current_mode =
    props.home_view_type == HOME_VIEW_TYPES.WEB
      ? props.web_mode
      : props.api_mode

  const update_chat_history = (instruction: string) => {
    if (!instruction.trim()) {
      return
    }

    if (!current_mode) return

    let history: string[] | undefined
    let set_history: React.Dispatch<React.SetStateAction<string[] | undefined>>

    if (current_mode == 'ask') {
      history = ask_history
      set_history = set_ask_history
    } else if (current_mode == 'edit-context') {
      history = edit_history
      set_history = set_edit_history
    } else if (current_mode == 'no-context') {
      history = no_context_history
      set_history = set_no_context_history
    } else if (current_mode == 'code-completions') {
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
        mode: current_mode
      })
    }
  }

  const handle_toggle_default_preset = (name: string) => {
    if (all_presets) {
      const presets_for_current_mode = all_presets[props.web_mode]
      const updated_presets = presets_for_current_mode.map((p) =>
        p.name == name ? { ...p, is_default: !p.is_default } : p
      )

      set_all_presets({ ...all_presets, [props.web_mode]: updated_presets })

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
          system_instructions: preset.system_instructions,
          options: preset.options,
          port: preset.port,
          is_default: preset.is_default || undefined
        }))
      })
    }
  }

  const handle_initialize_chats = async (params: {
    preset_names?: string[]
  }) => {
    post_message(props.vscode, {
      command: 'SEND_PROMPT',
      preset_names: params.preset_names
    })

    update_chat_history(instructions)
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
      set_all_presets({ ...all_presets, [current_mode]: reordered_presets })
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
        system_instructions: preset.system_instructions,
        options: preset.options,
        port: preset.port,
        is_default: preset.is_default
      }))
    })
  }

  const handle_create_preset = () => {
    post_message(props.vscode, {
      command: 'CREATE_PRESET'
    })
  }

  const handle_preset_edit = (name: string) => {
    const current_presets = all_presets ? all_presets[props.web_mode] : []
    const preset = current_presets.find((preset) => preset.name == name)
    if (preset) props.on_preset_edit(preset)
  }

  const handle_preset_duplicate = (name: string) => {
    post_message(props.vscode, {
      command: 'DUPLICATE_PRESET',
      name
    })
  }

  const handle_preset_delete = (name: string) => {
    post_message(props.vscode, {
      command: 'DELETE_PRESET',
      name
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

  const handle_caret_position_change = (
    caret_position: number,
    from_selection: boolean
  ) => {
    if (!from_selection) {
      set_caret_position_to_set(caret_position)
    }

    post_message(props.vscode, {
      command: 'CARET_POSITION_CHANGED',
      caret_position
    })
  }

  const get_current_instructions = () => {
    if (is_in_code_completions_mode) {
      return props.code_completions_instructions
    }
    const mode =
      props.home_view_type == HOME_VIEW_TYPES.WEB
        ? props.web_mode
        : props.api_mode
    if (mode == 'ask') return props.ask_instructions
    if (mode == 'edit-context') return props.edit_instructions
    if (mode == 'no-context') return props.no_context_instructions
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
      command: 'SHOW_AT_SIGN_QUICK_PICK'
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

  const handle_manage_configurations_click = () => {
    if (props.api_mode == 'edit-context') {
      post_message(props.vscode, {
        command: 'EXECUTE_COMMAND',
        command_id: 'codeWebChat.settings.editContext'
      })
    } else if (props.api_mode == 'code-completions') {
      post_message(props.vscode, {
        command: 'EXECUTE_COMMAND',
        command_id: 'codeWebChat.settings.codeCompletions'
      })
    }
  }

  const handle_configuration_click = (index: number) => {
    const instruction = get_current_instructions()

    if (props.api_mode == 'edit-context') {
      post_message(props.vscode, {
        command: 'EDIT_CONTEXT',
        use_quick_pick: false,
        config_index: index
      })
    } else if (props.api_mode == 'code-completions') {
      post_message(props.vscode, {
        command: 'CODE_COMPLETION',
        use_quick_pick: false,
        config_index: index
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

  const instructions =
    current_mode == 'ask'
      ? props.ask_instructions
      : current_mode == 'edit-context'
      ? props.edit_instructions
      : current_mode == 'no-context'
      ? props.no_context_instructions
      : current_mode == 'code-completions'
      ? props.code_completions_instructions
      : ''

  const set_instructions = (value: string) => {
    props.set_instructions(value, current_mode)
  }

  let current_history: string[] | undefined
  if (current_mode == 'ask') {
    current_history = ask_history
  } else if (current_mode == 'edit-context') {
    current_history = edit_history
  } else if (current_mode == 'no-context') {
    current_history = no_context_history
  } else if (current_mode == 'code-completions') {
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
    api_edit_format === undefined
  ) {
    return <></>
  }

  const presets_for_current_mode = all_presets[props.web_mode]

  const configurations_for_current_mode =
    all_configurations && props.home_view_type == HOME_VIEW_TYPES.API
      ? all_configurations[props.api_mode]
      : []

  return (
    <HomeView
      on_show_intro={props.on_show_intro}
      initialize_chats={handle_initialize_chats}
      copy_to_clipboard={handle_copy_to_clipboard}
      configurations={configurations_for_current_mode || []}
      on_configuration_click={handle_configuration_click}
      on_manage_configurations_click={handle_manage_configurations_click}
      on_search_click={handle_search_click}
      on_at_sign_click={handle_at_sign_click}
      on_curly_braces_click={handle_curly_braces_click}
      is_connected={props.is_connected}
      presets={presets_for_current_mode}
      on_create_preset={handle_create_preset}
      on_quick_action_click={handle_quick_action_click}
      has_active_editor={props.has_active_editor}
      has_active_selection={props.has_active_selection}
      chat_history={current_history || []}
      token_count={token_count}
      selection_text={selection_text}
      web_mode={props.web_mode}
      api_mode={props.api_mode}
      on_web_mode_change={props.on_web_mode_change}
      on_api_mode_change={props.on_api_mode_change}
      chat_edit_format={chat_edit_format}
      api_edit_format={api_edit_format}
      on_chat_edit_format_change={handle_chat_edit_format_change}
      on_api_edit_format_change={handle_api_edit_format_change}
      on_presets_reorder={handle_presets_reorder}
      on_preset_edit={handle_preset_edit}
      on_preset_duplicate={handle_preset_duplicate}
      on_preset_delete={handle_preset_delete}
      on_toggle_default_preset={handle_toggle_default_preset}
      instructions={instructions}
      set_instructions={set_instructions}
      on_caret_position_change={handle_caret_position_change}
      home_view_type={props.home_view_type}
      on_home_view_type_change={props.on_home_view_type_change}
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
      is_focused={is_focused}
    />
  )
}
