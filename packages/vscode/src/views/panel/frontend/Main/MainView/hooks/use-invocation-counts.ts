import { useState } from 'react'
import { MODE, Mode } from '@/views/panel/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

type Params = {
  mode: Mode
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
}

export const use_invocation_counts = (params: Params) => {
  const [invocation_counts, set_invocation_counts] = useState<
    Record<string, number>
  >({})

  const current_invocation_key =
    params.mode == MODE.WEB
      ? `${params.mode}:${params.web_prompt_type}`
      : `${params.mode}:${params.api_prompt_type}`

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
