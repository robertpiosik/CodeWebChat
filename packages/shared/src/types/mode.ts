export const TARGET = {
  WEB: 'WEB',
  API: 'API'
}

export type Target = (typeof TARGET)[keyof typeof TARGET]
