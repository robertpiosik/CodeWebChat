import { useState, useEffect, useCallback } from 'react'
import {
  PromptInstruction,
  BackendMessage,
  PromptInstructionKey
} from '../../types/messages'
import { post_message } from '../utils/post-message'

export const use_prompt_instruction_editing = (
  vscode: any,
  instructions:
    | Partial<Record<PromptInstructionKey, PromptInstruction[]>>
    | undefined,
  on_update_instructions: (
    key: PromptInstructionKey,
    items: PromptInstruction[]
  ) => void
) => {
  const [updating_instruction, set_updating_instruction] = useState<{
    key: PromptInstructionKey
    index?: number
    insertion_index?: number
    instruction: PromptInstruction
  } | null>(null)
  const [updated_instruction, set_updated_instruction] =
    useState<PromptInstruction | null>(null)

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      if (event.data.command === 'START_PROMPT_INSTRUCTION_CREATION') {
        set_updating_instruction({
          key: event.data.key,
          insertion_index: event.data.insertion_index,
          instruction: event.data.instruction
        })
        set_updated_instruction(event.data.instruction)
      } else if (event.data.command === 'PROMPT_INSTRUCTION_EDIT_CANCELLED') {
        set_updating_instruction(null)
        set_updated_instruction(null)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_instruction_cancel_handler = useCallback(() => {
    if (updating_instruction && updated_instruction) {
      const a = updating_instruction.instruction
      const b = updated_instruction
      const a_name = (a.name || '').trim()
      const b_name = (b.name || '').trim()
      const a_val = a.value
      const b_val = b.value
      const has_changes = a_name !== b_name || a_val !== b_val

      if (has_changes) {
        post_message(vscode, {
          command: 'CANCEL_PROMPT_INSTRUCTION_EDIT',
          key: updating_instruction.key
        })
        return
      }
    }
    set_updating_instruction(null)
    set_updated_instruction(null)
  }, [vscode, updating_instruction, updated_instruction])

  const edit_instruction_save_handler = useCallback(() => {
    if (updating_instruction && updated_instruction) {
      const { key, index, insertion_index } = updating_instruction
      const updated_list = [...(instructions?.[key] || [])]

      if (index !== undefined) {
        updated_list[index] = updated_instruction
      } else if (insertion_index !== undefined) {
        updated_list.splice(insertion_index, 0, updated_instruction)
      } else {
        updated_list.push(updated_instruction)
      }

      on_update_instructions(key, updated_list)
    }
    set_updating_instruction(null)
    set_updated_instruction(null)
  }, [
    updating_instruction,
    updated_instruction,
    instructions,
    on_update_instructions
  ])

  const start_editing_instruction = useCallback(
    (key: PromptInstructionKey, index: number) => {
      const item = instructions?.[key]?.[index]
      if (item) {
        set_updating_instruction({ key, index, instruction: item })
        set_updated_instruction(item)
      }
    },
    [instructions]
  )

  return {
    updating_instruction,
    set_updated_instruction,
    edit_instruction_cancel_handler,
    edit_instruction_save_handler,
    start_editing_instruction
  }
}
