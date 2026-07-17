import {
  CancelApiManagerRequestMessage,
  ShowApiManagerProgressMessage,
  HideApiManagerProgressMessage
} from '@/views/shared/types/messages'

export type FrontendMessage = CancelApiManagerRequestMessage

export type BackendMessage =
  | ShowApiManagerProgressMessage
  | HideApiManagerProgressMessage
