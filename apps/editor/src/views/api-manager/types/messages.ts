import {
  CancelApiManagerRequestMessage,
  ShowApiManagerProgressMessage,
  HideApiManagerProgressMessage
} from '@/views/shared/types/messages'

export type GetChatsMessage = {
  command: 'GET_CHATS'
}

export type DeleteChatMessage = {
  command: 'DELETE_CHAT'
  timestamp: number
}

export type ChatsMessage = {
  command: 'CHATS'
  chats: { timestamp: number }[]
}

export type FrontendMessage =
  | CancelApiManagerRequestMessage
  | GetChatsMessage
  | DeleteChatMessage

export type BackendMessage =
  | ShowApiManagerProgressMessage
  | HideApiManagerProgressMessage
  | ChatsMessage
