import { ApiMode, WebMode } from '@shared/types/modes'

export const web_mode_labels: Record<WebMode, string> = {
  'edit-context': 'Edit context',
  ask: 'Ask about context',
  'no-context': 'No context',
  'code-completions': 'Code at cursor'
}
export const WEB_MODES = Object.keys(web_mode_labels) as WebMode[]

export const api_mode_labels: Record<ApiMode, string> = {
  'edit-context': 'Edit context',
  'code-completions': 'Code at cursor'
}
export const API_MODES = Object.keys(api_mode_labels) as ApiMode[]
