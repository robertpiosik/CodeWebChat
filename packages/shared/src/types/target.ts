export const TARGET = {
  WEB: 'WEB',
  API: 'API',
  CLI: 'CLI'
}

export type Target = (typeof TARGET)[keyof typeof TARGET]
