type ChatInitializedMessage = {
  action: 'chat-initialized'
}

type ApplyResponseMessage = {
  action: 'apply-response'
  client_id: number
  raw_instructions?: string
  url?: string
}

type FinishedRespondingMessage = {
  action: 'finished-responding'
}

export type Message =
  | ChatInitializedMessage
  | ApplyResponseMessage
  | FinishedRespondingMessage
