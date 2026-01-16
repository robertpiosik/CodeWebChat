import { compact_c_style } from './languages/c-style'
import { compact_css } from './languages/css'
import { compact_html } from './languages/html'
import { compact_jsx } from './languages/jsx'
import { compact_python } from './languages/python'
import { compact_ruby } from './languages/ruby'
import { compact_sql } from './languages/sql'

export const compact_file = (content: string, extension: string): string => {
  if (extension == '.py') {
    return compact_python(content)
  } else if (['.tsx', '.jsx'].includes(extension)) {
    return compact_jsx(content)
  } else if (extension == '.rb') {
    return compact_ruby(content)
  } else if (['.css', '.scss', '.sass'].includes(extension)) {
    return compact_css(content)
  } else if (extension == '.sql') {
    return compact_sql(content)
  } else if (['.html', '.htm'].includes(extension)) {
    return compact_html(content)
  } else {
    return compact_c_style(content, true)
  }
}
