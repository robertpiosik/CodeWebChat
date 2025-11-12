export const MAIN_VIEW_TYPES = {
  WEB: 'New chat',
  API: 'API call'
}

export type MainViewType =
  (typeof MAIN_VIEW_TYPES)[keyof typeof MAIN_VIEW_TYPES]
