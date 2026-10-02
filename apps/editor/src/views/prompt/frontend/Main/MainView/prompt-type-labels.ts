import {
  ApiPromptType,
  WebPromptType,
  CliPromptType
} from '@shared/types/prompt-types'

export const web_prompt_type_labels: Record<WebPromptType, string> = {
  edit: 'Edit',
  ask: 'Ask'
}
export const WEB_PROMPT_TYPES = Object.keys(
  web_prompt_type_labels
) as WebPromptType[]

export const api_prompt_type_labels: Record<ApiPromptType, string> = {
  edit: 'Edit'
}
export const API_PROMPT_TYPES = Object.keys(
  api_prompt_type_labels
) as ApiPromptType[]

export const cli_prompt_type_labels: Record<CliPromptType, string> = {
  edit: 'Edit',
  ask: 'Ask'
}
export const CLI_PROMPT_TYPES = Object.keys(
  cli_prompt_type_labels
) as CliPromptType[]
