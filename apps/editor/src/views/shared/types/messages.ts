export interface BaseMessage {
  command: string
}

export interface CancelApiManagerRequestMessage extends BaseMessage {
  command: 'CANCEL_API_MANAGER_REQUEST'
  id: string
}

export interface ShowApiManagerProgressMessage extends BaseMessage {
  command: 'SHOW_API_MANAGER_PROGRESS'
  id: string
  status: string
  tokens_per_second?: number
  total_tokens?: number
  provider_name: string
  model?: string
  reasoning_effort?: string
}

export interface HideApiManagerProgressMessage extends BaseMessage {
  command: 'HIDE_API_MANAGER_PROGRESS'
  id: string
}
