import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const web_prompt_type_labels: Record<WebPromptType, string> = {
  'edit-files': 'Edit',
  'ask-about-files': 'Ask'
}
export const WEB_PROMPT_TYPES = Object.keys(
  web_prompt_type_labels
) as WebPromptType[]

export const api_prompt_type_labels: Record<ApiPromptType, string> = {
  'edit-files': 'Edit'
}
export const API_PROMPT_TYPES = Object.keys(
  api_prompt_type_labels
) as ApiPromptType[]
