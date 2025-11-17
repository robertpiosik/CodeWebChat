export const format_token_count = (count?: number): string | undefined => {
  if (!count) return undefined
  if (count < 1000) {
    return count.toString()
  } else {
    return `${Math.floor(count / 1000)}K+`
  }
}
