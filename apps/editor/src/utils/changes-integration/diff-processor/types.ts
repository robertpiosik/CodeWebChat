export type ReplaceLine = {
  content: string
  search_index: number | null
  insert_after_search_index: number
}

export type SearchBlock = {
  search_lines: string[]
  replace_lines: ReplaceLine[]
  after_search_lines: string[]
  search_block_start_index: number
  actual_original_line_count: number
  search_to_original_map: Map<number, number>
}

export type NormalizedLine = {
  key: number
  value: string
}
