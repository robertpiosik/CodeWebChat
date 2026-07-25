import { useRef, useCallback } from 'react'

import { MODE, Mode } from '@/views/panel/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

type UseAlternatePromptTypeParams = {
  mode: Mode
  web_prompt_type: WebPromptType
  api_prompt_type: ApiPromptType
  on_web_prompt_type_change: (prompt_type: WebPromptType) => void
  on_api_prompt_type_change: (prompt_type: ApiPromptType) => void
}

export const use_alternate_prompt_type = ({
  mode,
  web_prompt_type,
  api_prompt_type,
  on_web_prompt_type_change,
  on_api_prompt_type_change
}: UseAlternatePromptTypeParams) => {
  const prev_web_prompt_type_ref = useRef<WebPromptType>()
  const current_web_prompt_type_ref = useRef<WebPromptType>(web_prompt_type)

  if (web_prompt_type !== current_web_prompt_type_ref.current) {
    prev_web_prompt_type_ref.current = current_web_prompt_type_ref.current
    current_web_prompt_type_ref.current = web_prompt_type
  }

  const prev_api_prompt_type_ref = useRef<ApiPromptType>()
  const current_api_prompt_type_ref = useRef<ApiPromptType>(api_prompt_type)

  if (api_prompt_type !== current_api_prompt_type_ref.current) {
    prev_api_prompt_type_ref.current = current_api_prompt_type_ref.current
    current_api_prompt_type_ref.current = api_prompt_type
  }

  const has_alternate =
    mode == MODE.WEB
      ? !!prev_web_prompt_type_ref.current
      : !!prev_api_prompt_type_ref.current

  const handle_alternate_click = useCallback(() => {
    if (mode == MODE.WEB) {
      if (prev_web_prompt_type_ref.current) {
        on_web_prompt_type_change(prev_web_prompt_type_ref.current)
      }
    } else {
      if (prev_api_prompt_type_ref.current) {
        on_api_prompt_type_change(prev_api_prompt_type_ref.current)
      }
    }
  }, [mode, on_web_prompt_type_change, on_api_prompt_type_change])

  return { handle_alternate_click, has_alternate }
}
