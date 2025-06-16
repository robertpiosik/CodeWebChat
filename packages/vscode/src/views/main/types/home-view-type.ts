export const HOME_VIEW_TYPES = {
  WEB: 'Web',
  API: 'API'
} as const

export type HomeViewType =
  (typeof HOME_VIEW_TYPES)[keyof typeof HOME_VIEW_TYPES]
