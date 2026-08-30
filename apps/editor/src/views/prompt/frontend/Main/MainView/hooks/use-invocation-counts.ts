import { useState } from 'react'
import { TARGET, Target } from '@shared/types/mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

type Params = {
  target: Target
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
}

export const use_invocation_counts = (params: Params) => {
  const [invocation_counts, set_invocation_counts] = useState<
    Record<string, number>
  >({})

  const current_invocation_key =
    params.target == TARGET.WEB
      ? `${params.target}:${params.web_prompt_type}`
      : `${params.target}:${params.api_prompt_type}`

  const current_invocation_count =
    invocation_counts[current_invocation_key] ?? 1

  const handle_invocation_count_change = (count: number) => {
    set_invocation_counts((prev) => ({
      ...prev,
      [current_invocation_key]: count
    }))
  }

  return {
    current_invocation_count,
    handle_invocation_count_change
  }
}
