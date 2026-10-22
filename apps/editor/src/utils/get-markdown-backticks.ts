export const get_markdown_backticks = (content: string): string => {
  const match = content.match(/`{3,}/g)
  return '`'.repeat(Math.max(3, (match ? match.reduce((max, m) => Math.max(max, m.length), 0) : 0) + 1))
}