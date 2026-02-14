import { useState, useEffect } from 'react'
import { BackendMessage, InstructionsState } from '../../../types/messages'
import { post_message } from '../../utils/post_message'
import { Mode, MODE } from '../../../types/main-view-mode'
import { WebPromptType, ApiPromptType } from '@shared/types/prompt-types'

export const use_instructions = (
  vscode: any,
  mode: Mode | undefined,
  web_prompt_type: WebPromptType | undefined,
  api_prompt_type: ApiPromptType | undefined
) => {
  const [ask_about_context_instructions, set_ask_about_context_instructions] =
    useState<InstructionsState | undefined>()
  const [edit_context_instructions, set_edit_context_instructions] = useState<
    InstructionsState | undefined
  >()
  const [no_context_instructions, set_no_context_instructions] = useState<
    InstructionsState | undefined
  >()
  const [code_at_cursor_instructions, set_code_at_cursor_instructions] =
    useState<InstructionsState | undefined>(undefined)
  const [prune_context_instructions, set_prune_context_instructions] = useState<
    InstructionsState | undefined
  >(undefined)

  const handle_instructions_change = (
    value: string,
    prompt_type:
      | 'ask-about-context'
      | 'edit-context'
      | 'no-context'
      | 'code-at-cursor'
      | 'prune-context'
  ) => {
    const update_state = (
      current_state: InstructionsState | undefined,
      set_state: React.Dispatch<
        React.SetStateAction<InstructionsState | undefined>
      >
    ) => {
      const new_state = {
        instructions: [...(current_state?.instructions ?? [''])],
        active_index: current_state?.active_index ?? 0
      }

      new_state.instructions[new_state.active_index] = value
      set_state(new_state)

      post_message(vscode, {
        command: 'SAVE_INSTRUCTIONS',
        instruction: new_state,
        prompt_type: prompt_type
      })
    }

    if (prompt_type == 'ask-about-context') {
      update_state(
        ask_about_context_instructions,
        set_ask_about_context_instructions
      )
    } else if (prompt_type == 'edit-context') {
      update_state(edit_context_instructions, set_edit_context_instructions)
    } else if (prompt_type == 'no-context') {
      update_state(no_context_instructions, set_no_context_instructions)
    } else if (prompt_type == 'code-at-cursor') {
      update_state(code_at_cursor_instructions, set_code_at_cursor_instructions)
    } else if (prompt_type == 'prune-context') {
      update_state(prune_context_instructions, set_prune_context_instructions)
    }
  }

  const handle_tab_change = (index: number) => {
    const prompt_type = (
      mode == MODE.WEB ? web_prompt_type : api_prompt_type
    ) as any
    const update = (
      state: InstructionsState | undefined,
      setter: React.Dispatch<
        React.SetStateAction<InstructionsState | undefined>
      >
    ) => {
      if (!state) return
      const new_state = { ...state, active_index: index }
      setter(new_state)
      post_message(vscode, {
        command: 'SAVE_INSTRUCTIONS',
        instruction: new_state,
        prompt_type
      })
    }

    if (prompt_type == 'ask-about-context') {
      update(ask_about_context_instructions, set_ask_about_context_instructions)
    } else if (prompt_type == 'edit-context') {
      update(edit_context_instructions, set_edit_context_instructions)
    } else if (prompt_type == 'no-context') {
      update(no_context_instructions, set_no_context_instructions)
    } else if (prompt_type == 'code-at-cursor') {
      update(code_at_cursor_instructions, set_code_at_cursor_instructions)
    } else if (prompt_type == 'prune-context') {
      update(prune_context_instructions, set_prune_context_instructions)
    }
  }

  const handle_new_tab = () => {
    const prompt_type = (
      mode == MODE.WEB ? web_prompt_type : api_prompt_type
    ) as any
    const update = (
      state: InstructionsState | undefined,
      setter: React.Dispatch<
        React.SetStateAction<InstructionsState | undefined>
      >
    ) => {
      const current_instructions = state?.instructions ?? ['']
      const new_state = {
        instructions: [...current_instructions, ''],
        active_index: current_instructions.length
      }
      setter(new_state)
      post_message(vscode, {
        command: 'SAVE_INSTRUCTIONS',
        instruction: new_state,
        prompt_type
      })
    }

    if (prompt_type == 'ask-about-context') {
      update(ask_about_context_instructions, set_ask_about_context_instructions)
    } else if (prompt_type == 'edit-context') {
      update(edit_context_instructions, set_edit_context_instructions)
    } else if (prompt_type == 'no-context') {
      update(no_context_instructions, set_no_context_instructions)
    } else if (prompt_type == 'code-at-cursor') {
      update(code_at_cursor_instructions, set_code_at_cursor_instructions)
    } else if (prompt_type == 'prune-context') {
      update(prune_context_instructions, set_prune_context_instructions)
    }
  }

  const handle_tab_delete = (index: number) => {
    const prompt_type = (
      mode == MODE.WEB ? web_prompt_type : api_prompt_type
    ) as any
    const update = (
      state: InstructionsState | undefined,
      setter: React.Dispatch<
        React.SetStateAction<InstructionsState | undefined>
      >
    ) => {
      if (!state || state.instructions.length <= 1) return

      const new_instructions = state.instructions.filter((_, i) => i != index)
      let new_active_index = state.active_index

      if (index <= state.active_index) {
        new_active_index = Math.max(0, state.active_index - 1)
      }

      const new_state = {
        instructions: new_instructions,
        active_index: new_active_index
      }
      setter(new_state)
      post_message(vscode, {
        command: 'SAVE_INSTRUCTIONS',
        instruction: new_state,
        prompt_type
      })
    }

    if (prompt_type == 'ask-about-context') {
      update(ask_about_context_instructions, set_ask_about_context_instructions)
    } else if (prompt_type == 'edit-context') {
      update(edit_context_instructions, set_edit_context_instructions)
    } else if (prompt_type == 'no-context') {
      update(no_context_instructions, set_no_context_instructions)
    } else if (prompt_type == 'code-at-cursor') {
      update(code_at_cursor_instructions, set_code_at_cursor_instructions)
    } else if (prompt_type == 'prune-context') {
      update(prune_context_instructions, set_prune_context_instructions)
    }
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'INSTRUCTIONS') {
        set_ask_about_context_instructions(message.ask_about_context)
        set_edit_context_instructions(message.edit_context)
        set_no_context_instructions(message.no_context)
        set_code_at_cursor_instructions(message.code_at_cursor)
        set_prune_context_instructions(message.prune_context)
      }
    }

    window.addEventListener('message', handle_message)
    post_message(vscode, { command: 'GET_INSTRUCTIONS' })
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    ask_about_context_instructions,
    edit_context_instructions,
    no_context_instructions,
    code_at_cursor_instructions,
    prune_context_instructions,
    handle_instructions_change,
    handle_tab_change,
    handle_new_tab,
    handle_tab_delete
  }
}
