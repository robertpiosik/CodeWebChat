export const HOME_VIEW_TYPES = {
  WEB: 'New chat',
  API: 'API call'
}

export type HomeViewType =
  (typeof HOME_VIEW_TYPES)[keyof typeof HOME_VIEW_TYPES]
