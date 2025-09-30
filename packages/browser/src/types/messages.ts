import { Website } from '@/views/popup/hooks/use-websites-store'

type UpdateSavedWebsitesMessage = {
  action: 'update-saved-websites'
  websites: Website[]
}

type ChatInitializedMessage = {
  action: 'chat-initialized'
}

type ApplyChatResponseMessage = {
  action: 'apply-chat-response'
  client_id: number
  raw_instructions?: string
}

type GetTabDataMessage = {
  action: 'get-tab-data'
  url: string
}

export type Message =
  | UpdateSavedWebsitesMessage
  | ChatInitializedMessage
  | ApplyChatResponseMessage
  | GetTabDataMessage
