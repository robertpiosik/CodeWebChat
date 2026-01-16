import { compact_c_style } from './languages/c-style'
import { compact_python } from './languages/python'

export const compact_file = (content: string, extension: string): string => {
  if (extension == '.py') {
    return compact_python(content)
  }

  return compact_c_style(content, true)
}
