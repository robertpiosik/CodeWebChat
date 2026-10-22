import { shrink_c_style } from './c-style'
import { shrink_css } from './css'

export const shrink_html = (content: string): string => {
  const scripts: { open: string; content: string }[] = []
  const styles: { open: string; content: string }[] = []

  let processed = content.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (match, open, inner) => {
      scripts.push({ open, content: inner })
      return `___SCRIPT_${scripts.length - 1}___`
    }
  )

  processed = processed.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (match, open, inner) => {
      styles.push({ open, content: inner })
      return `___STYLE_${styles.length - 1}___`
    }
  )

  const lines = processed.split(/\r?\n/)
  const shrunk_lines: string[] = []
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed.trim()) {
      shrunk_lines.push(trimmed)
    }
  }
  processed = shrunk_lines.join('\n')

  processed = processed.replace(/___SCRIPT_(\d+)___/g, (_, idx) => {
    const { open, content } = scripts[parseInt(idx)]
    const shrunk = shrink_c_style(content).trimEnd()
    return `${open}\n${shrunk}\n</script>`
  })

  processed = processed.replace(/___STYLE_(\d+)___/g, (_, idx) => {
    const { open, content } = styles[parseInt(idx)]
    const shrunk = shrink_css(content).trimEnd()
    return `${open}\n${shrunk}\n</style>`
  })

  return processed + '\n'
}
