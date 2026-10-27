export type Chat = {
  url: string
  model?: string
  reasoning_effort?: string
  system_instructions?: string
  options?: string[]
}

export type ConnectedBrowser = {
  id: string
  version: string
  user_agent: string
  profile_name?: string
}

export type InitializeChatMessage = {
  action: 'initialize-chat'
  text: string
  url: string
  client_id: string
  chatbot?: string
  model?: string
  target_browser_id?: string
  reasoning_effort?: string
  system_instructions?: string
  options?: string[]
  raw_instructions?: string
  inject_apply_response_button?: boolean
}

export type BrowserConnectionStatusMessage = {
  action: 'browser-connection-status'
  connected_browsers: ConnectedBrowser[]
}

export type ApplyResponseMessage = {
  action: 'apply-response'
  client_id: string
  raw_instructions?: string
  web_configuration_details?: {
    chatbot: string
    model?: string
    reasoning_effort?: string
  }
}

export type ClientIdAssignmentMessage = {
  action: 'client-id-assignment'
  client_id: string
}

export type PingMessage = {
  action: 'ping'
}

export type PongMessage = {
  action: 'pong'
}

export type ForwardedPortsMessage = {
  action: 'forwarded-ports'
  ports: number[]
}

export type WebSocketMessage =
  | InitializeChatMessage
  | BrowserConnectionStatusMessage
  | ClientIdAssignmentMessage
  | ApplyResponseMessage
  | PingMessage
  | PongMessage
  | ForwardedPortsMessage
