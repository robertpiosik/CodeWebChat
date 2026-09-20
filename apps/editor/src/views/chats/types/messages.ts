type BaseMessage = {
  command: string
}

interface CancelPromptViewApiCallsManagerRequestMessage extends BaseMessage {
  command: 'CANCEL_PROMPT_VIEW_API_CALLS_MANAGER_REQUEST'
  id: string
}

interface ShowPromptViewApiCallsManagerProgressMessage extends BaseMessage {
  command: 'SHOW_PROMPT_VIEW_API_CALLS_MANAGER_PROGRESS'
  id: string
  status: string
  tokens_per_second?: number
  total_tokens?: number
  provider_name: string
  model?: string
  reasoning_effort?: string
}

interface HidePromptViewApiCallsManagerProgressMessage extends BaseMessage {
  command: 'HIDE_PROMPT_VIEW_API_CALLS_MANAGER_PROGRESS'
  id: string
}

export interface GetChatsMessage extends BaseMessage {
  command: 'GET_CHATS'
}

export interface DeleteChatMessage extends BaseMessage {
  command: 'DELETE_CHAT'
  timestamp: number
}

export interface ChatsMessage extends BaseMessage {
  command: 'CHATS'
  chats: { timestamp: number }[]
}

export type FrontendMessage =
  | CancelPromptViewApiCallsManagerRequestMessage
  | GetChatsMessage
  | DeleteChatMessage

export type BackendMessage =
  | ShowPromptViewApiCallsManagerProgressMessage
  | HidePromptViewApiCallsManagerProgressMessage
  | ChatsMessage
