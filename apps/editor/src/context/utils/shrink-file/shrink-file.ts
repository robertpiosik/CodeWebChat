import { shrink_c_style } from './languages/c-style'
import { shrink_css } from './languages/css'
import { shrink_html } from './languages/html'
import { shrink_jsx } from './languages/jsx'
import { shrink_python } from './languages/python'
import { shrink_ruby } from './languages/ruby'
import { shrink_sql } from './languages/sql'

export const shrink_file = (content: string, extension: string): string => {
  if (extension == '.py') {
    return shrink_python(content)
  } else if (['.tsx', '.jsx'].includes(extension)) {
    return shrink_jsx(content)
  } else if (extension == '.rb') {
    return shrink_ruby(content)
  } else if (['.css', '.scss', '.sass'].includes(extension)) {
    return shrink_css(content)
  } else if (extension == '.sql') {
    return shrink_sql(content)
  } else if (['.html', '.htm'].includes(extension)) {
    return shrink_html(content)
  } else if (
    [
      '.ts',
      '.js',
      '.c',
      '.cpp',
      '.cs',
      '.java',
      '.php',
      '.go',
      '.rs',
      '.swift',
      '.kt',
      '.dart'
    ].includes(extension)
  ) {
    return shrink_c_style(content)
  } else {
    return content
  }
}
