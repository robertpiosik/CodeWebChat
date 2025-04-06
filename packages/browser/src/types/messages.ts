import { Website } from '@/views/popup/hooks/use-websites-store'

export type UpdateSavedWebsitesMessage = {
  action: 'update-saved-websites'
  websites: Website[]
}

export type ChatInitializedMessage = {
  action: 'chat-initialized'
}

export type InvokeFastReplaceMessage = {
  action: 'invoke-fast-replace'
  client_id: number
}

export type GetTabDataMessage = {
  action: 'get-tab-data'
  url: string
}

export type Message =
  | UpdateSavedWebsitesMessage
  | ChatInitializedMessage
  | InvokeFastReplaceMessage
  | GetTabDataMessage
