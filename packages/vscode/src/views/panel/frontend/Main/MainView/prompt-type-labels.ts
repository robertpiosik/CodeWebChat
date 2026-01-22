import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const web_prompt_type_labels: Record<WebPromptType, string> = {
  'edit-context': 'Edit context',
  'ask-about-context': 'Ask about context',
  'no-context': 'No context',
  'code-at-cursor': 'Code at cursor',
  'prune-context': 'Prune context'
}
export const WEB_PROMPT_TYPES = Object.keys(
  web_prompt_type_labels
) as WebPromptType[]

export const api_prompt_type_labels: Record<ApiPromptType, string> = {
  'edit-context': 'Edit context',
  'code-at-cursor': 'Code at cursor',
  'prune-context': 'Prune context'
}
export const API_PROMPT_TYPES = Object.keys(
  api_prompt_type_labels
) as ApiPromptType[]
