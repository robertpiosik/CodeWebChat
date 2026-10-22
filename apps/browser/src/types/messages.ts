type ChatInitializedMessage = {
  action: 'chat-initialized'
}

type ApplyResponseMessage = {
  action: 'apply-response'
  client_id: string
  raw_instructions?: string
  web_configuration_details?: {
    chatbot: string
    model?: string
    reasoning_effort?: string
  }
}

type FinishedRespondingMessage = {
  action: 'finished-responding'
}

export type Message =
  | ChatInitializedMessage
  | ApplyResponseMessage
  | FinishedRespondingMessage
