export interface BaseMessage {
  command: string
}

export interface CancelPromptViewApiCallsManagerRequestMessage extends BaseMessage {
  command: 'CANCEL_PROMPT_VIEW_API_CALLS_MANAGER_REQUEST'
  id: string
}

export interface ShowPromptViewApiCallsManagerProgressMessage extends BaseMessage {
  command: 'SHOW_PROMPT_VIEW_API_CALLS_MANAGER_PROGRESS'
  id: string
  status: string
  tokens_per_second?: number
  total_tokens?: number
  provider_name: string
  model?: string
  reasoning_effort?: string
}

export interface HidePromptViewApiCallsManagerProgressMessage extends BaseMessage {
  command: 'HIDE_PROMPT_VIEW_API_CALLS_MANAGER_PROGRESS'
  id: string
}
