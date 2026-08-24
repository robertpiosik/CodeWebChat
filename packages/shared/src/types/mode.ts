export const MODE = {
  WEB: 'WEB',
  API: 'API'
}

export type Mode = (typeof MODE)[keyof typeof MODE]
