export const HOME_VIEW_TYPES = {
  WEB: 'Open browser',
  API: 'Call API'
} as const

export type HomeViewType =
  (typeof HOME_VIEW_TYPES)[keyof typeof HOME_VIEW_TYPES]
