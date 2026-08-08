import { WebPromptType } from './prompt-types'

export type Chat = {
  url: string
  model?: string
  reasoning_effort?: string
  system_instructions?: string
  options?: string[]
}

export type ConnectedBrowser = {
  id: number
  version: string
  user_agent: string
}

export type InitializeChatMessage = {
  action: 'initialize-chat'
  text: string
  url: string
  client_id: number // Client ID to identify which editor sent this message
  model?: string
  target_browser_id?: number
  reasoning_effort?: string
  system_instructions?: string
  options?: string[]
  raw_instructions?: string
  reuse_last_tab?: boolean
  invocation_count?: number
  inject_apply_response_button?: boolean
}

export type BrowserConnectionStatusMessage = {
  action: 'browser-connection-status'
  connected_browsers: ConnectedBrowser[]
}

export type ApplyResponseMessage = {
  action: 'apply-response'
  client_id: number
  raw_instructions?: string
  url?: string
}

export type ClientIdAssignmentMessage = {
  action: 'client-id-assignment'
  client_id: number
}

export type PingMessage = {
  action: 'ping'
}

export type PongMessage = {
  action: 'pong'
}

export type WebSocketMessage =
  | InitializeChatMessage
  | BrowserConnectionStatusMessage
  | ClientIdAssignmentMessage
  | ApplyResponseMessage
  | PingMessage
  | PongMessage
