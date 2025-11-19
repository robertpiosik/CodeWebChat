export const MAIN_VIEW_TYPES = {
  WEB: 'CHATBOTS',
  API: 'API CALLS'
}

export type MainViewType =
  (typeof MAIN_VIEW_TYPES)[keyof typeof MAIN_VIEW_TYPES]
