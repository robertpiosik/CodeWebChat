import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const web_prompt_type_labels: Record<WebPromptType, string> = {
  'edit-files': 'Edit files',
  'ask-about-files': 'Ask about files',
  'without-files': 'Without files'
}
export const WEB_PROMPT_TYPES = Object.keys(
  web_prompt_type_labels
) as WebPromptType[]

export const api_prompt_type_labels: Record<ApiPromptType, string> = {
  'edit-files': 'Edit files'
}
export const API_PROMPT_TYPES = Object.keys(
  api_prompt_type_labels
) as ApiPromptType[]
