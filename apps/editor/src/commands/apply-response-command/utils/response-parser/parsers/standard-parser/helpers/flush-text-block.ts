import { FileItem, TextItem, InlineFileItem } from '../../../response-parser'

export const flush_text_block = (params: {
  text_block: string
  results: (FileItem | TextItem | InlineFileItem)[]
}) => {
  if (!params.text_block.trim()) {
    return
  }

  const content =
    params.results.length == 0
      ? params.text_block.trim()
      : params.text_block.trimEnd()

  params.results.push({ type: 'text', content })
}
