type ChatInitializedMessage = {
  action: 'chat-initialized'
}

type ApplyChatResponseMessage = {
  action: 'apply-chat-response'
  client_id: number
  raw_instructions?: string
  edit_format?: string
}

export type Message = ChatInitializedMessage | ApplyChatResponseMessage
