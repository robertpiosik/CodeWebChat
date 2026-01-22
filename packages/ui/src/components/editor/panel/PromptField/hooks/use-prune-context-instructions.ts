import { useState, useRef, useEffect } from 'react'
import type { PromptFieldProps } from '../PromptField'

type UsePruneContextInstructionsParams = Pick<
  PromptFieldProps,
  | 'prune_context_instructions_prefix'
  | 'on_prune_context_instructions_prefix_change'
>

export const use_prune_context_instructions = ({
  prune_context_instructions_prefix,
  on_prune_context_instructions_prefix_change
}: UsePruneContextInstructionsParams) => {
  const [prune_instructions, set_prune_instructions] = useState(
    prune_context_instructions_prefix
  )

  const last_synced_prune_instructions_ref = useRef(
    prune_context_instructions_prefix
  )

  useEffect(() => {
    if (
      prune_context_instructions_prefix !==
      last_synced_prune_instructions_ref.current
    ) {
      set_prune_instructions(prune_context_instructions_prefix)
      last_synced_prune_instructions_ref.current =
        prune_context_instructions_prefix
    }
  }, [prune_context_instructions_prefix])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (prune_instructions != prune_context_instructions_prefix) {
        last_synced_prune_instructions_ref.current = prune_instructions
        on_prune_context_instructions_prefix_change(prune_instructions)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [
    prune_instructions,
    prune_context_instructions_prefix,
    on_prune_context_instructions_prefix_change
  ])

  return {
    prune_instructions,
    set_prune_instructions
  }
}
