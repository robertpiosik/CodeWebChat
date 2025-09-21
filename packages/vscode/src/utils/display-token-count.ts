export function display_token_count(token_count: number): string {
  if (token_count >= 1000) {
    return `${Math.floor(token_count / 1000)}k`
  }
  return `${token_count}`
}
