export type Chat = {
  url: string
  model?: string
  temperature?: number
  thinking_budget?: number
  reasoning_effort?: string
  top_p?: number
  system_instructions?: string
  options?: string[]
}

// Deprecated, used by browser clients older than 1.2.0
export type InitializeChatsMessage = {
  action: 'initialize-chats'
  text: string
  chats: Chat[]
  client_id: number // Client ID to identify which editor sent this message
  without_submission?: boolean
}

export type InitializeChatMessage = {
  action: 'initialize-chat'
  text: string
  url: string
  client_id: number // Client ID to identify which editor sent this message
  model?: string
  temperature?: number
  thinking_budget?: number
  reasoning_effort?: string
  top_p?: number
  system_instructions?: string
  options?: string[]
  without_submission?: boolean
}

export type Website = {
  url: string
  title: string
  content: string
  favicon?: string
}

export type UpdateSavedWebsitesMessage = {
  action: 'update-saved-websites'
  websites: Array<Website>
}

export type BrowserConnectionStatusMessage = {
  action: 'browser-connection-status'
  has_connected_browsers: boolean
}

export type ApplyChatResponseMessage = {
  action: 'apply-chat-response'
  client_id: number
}

export type ClientIdAssignmentMessage = {
  action: 'client-id-assignment'
  client_id: number
}

export type WebSocketMessage =
  | InitializeChatsMessage
  | InitializeChatMessage
  | UpdateSavedWebsitesMessage
  | BrowserConnectionStatusMessage
  | ClientIdAssignmentMessage
  | ApplyChatResponseMessage
