import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const web_mode_labels: Record<WebPromptType, string> = {
  'edit-context': 'Edit context',
  ask: 'Ask about context',
  'no-context': 'No context',
  'code-completions': 'Code at cursor'
}
export const WEB_MODES = Object.keys(web_mode_labels) as WebPromptType[]

export const api_mode_labels: Record<ApiPromptType, string> = {
  'edit-context': 'Edit context',
  'code-completions': 'Code at cursor'
}
export const API_MODES = Object.keys(api_mode_labels) as ApiPromptType[]
