export const MODE = {
  WEB: 'CHATBOTS',
  API: 'API CALLS'
}

export type Mode =
  (typeof MODE)[keyof typeof MODE]
