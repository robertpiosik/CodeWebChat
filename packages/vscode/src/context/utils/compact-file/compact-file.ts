import { compact_c_style } from './languages/c-style'
import { compact_css } from './languages/css'
import { compact_python } from './languages/python'
import { compact_ruby } from './languages/ruby'
import { compact_sql } from './languages/sql'

export const compact_file = (content: string, extension: string): string => {
  if (extension == '.py') {
    return compact_python(content)
  }
  if (extension == '.rb') {
    return compact_ruby(content)
  }
  if (['.css', '.scss', '.less'].includes(extension)) {
    return compact_css(content)
  }
  if (extension == '.sql') {
    return compact_sql(content)
  }

  return compact_c_style(content, true)
}
