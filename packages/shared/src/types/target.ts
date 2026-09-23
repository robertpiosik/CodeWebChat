export const TARGET = ['WEB', 'API', 'CLI'] as const

export type Target = (typeof TARGET)[number]
