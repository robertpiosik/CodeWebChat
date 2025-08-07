type Symbol = {
  mark: string
  label: string
  description: string
  regexp: RegExp
  exactMatch: (text: string) => boolean
  getValue: (text: string) => string
  markedValue: (text: string) => string
}

export function captureParts(...patterns: RegExp[]): RegExp {
  const sources = patterns.map((pattern) => pattern.source)

  return new RegExp(`(${sources.join('|')})`, 'g')
}

export const SYMBOLS = {
  File: {
    mark: '@File:',
    label: '@File',
    description: 'Reference a file',
    regexp: /@File:[^\s]+/,
    exactMatch: (text: string): boolean => {
      return new RegExp(`^${SYMBOLS.File.regexp.source}$`).test(text)
    },
    getValue: (text: string): string => {
      return text.slice(SYMBOLS.File.mark.length)
    },
    markedValue: (text: string): string => {
      return `${SYMBOLS.File.mark.slice(1)}${text} `
    }
  }
} as Record<string, Symbol>
