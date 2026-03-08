import { shrink_c_style } from './c-style'
import { shrink_css } from './css'

export const shrink_html = (content: string): string => {
  const scripts: { open: string; content: string }[] = []
  const styles: { open: string; content: string }[] = []

  // 1. Extract and mask Scripts
  // We use a placeholder to preserve the location while we process the rest of the HTML
  let processed = content.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (match, open, inner) => {
      scripts.push({ open, content: inner })
      return `___SCRIPT_${scripts.length - 1}___`
    }
  )

  // 2. Extract and mask Styles
  processed = processed.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (match, open, inner) => {
      styles.push({ open, content: inner })
      return `___STYLE_${styles.length - 1}___`
    }
  )

  // 3. Strip HTML Comments
  processed = processed.replace(/<!--[\s\S]*?-->/g, '')

  // 4. Shrink HTML Lines (Trim and remove empty lines)
  const lines = processed.split(/\r?\n/)
  const shrunk_lines: string[] = []
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed.trim()) {
      shrunk_lines.push(trimmed)
    }
  }
  processed = shrunk_lines.join('\n')

  // 5. Restore Scripts
  processed = processed.replace(/___SCRIPT_(\d+)___/g, (_, idx) => {
    const { open, content } = scripts[parseInt(idx)]
    // Treat as C-style but do NOT strip bodies (preserve logic, just strip comments)
    // as scripts in HTML are often minimal or structural.
    const shrunk = shrink_c_style(content).trimEnd()
    return `${open}\n${shrunk}\n</script>`
  })

  // 6. Restore Styles
  processed = processed.replace(/___STYLE_(\d+)___/g, (_, idx) => {
    const { open, content } = styles[parseInt(idx)]
    // Shrink CSS (strips bodies/properties usually)
    const shrunk = shrink_css(content).trimEnd()
    return `${open}\n${shrunk}\n</style>`
  })

  return processed + '\n'
}
