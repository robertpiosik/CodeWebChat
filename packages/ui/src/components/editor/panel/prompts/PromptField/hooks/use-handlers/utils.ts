import { RefObject } from 'react'
import {
  map_raw_pos_to_display_pos,
  set_caret_position_for_div
} from '../../../shared/symbols'

export const get_symbol_ranges = (params: {
  text: string
  context_file_paths: string[]
}): { start: number; end: number }[] => {
  const ranges: { start: number; end: number }[] = []
  const regex =
    /`([^`]+)`|(#Changes\([^)]+\))|(#Selection)|(#SavedContext\((?:WorkspaceState|JSON) "(?:\\.|[^"\\])*"\))|(#(?:Commit|ContextAtCommit)\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\))|(<fragment path="[^"]+"(?: [^>]+)?>[\s\S]*?<\/fragment>)|(#Skill\([^)]+\))|(#Image\([a-fA-F0-9]+\))|(#PastedText\([a-fA-F0-9]+:\d+\))|(#Website\([^)]+\))/g

  let match
  while ((match = regex.exec(params.text)) !== null) {
    const file_path = match[1]

    if (file_path) {
      if (params.context_file_paths.includes(file_path)) {
        ranges.push({ start: match.index, end: match.index + match[0].length })
      }
    } else {
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
  }
  return ranges
}

export const set_caret_position_after_change = (params: {
  input_ref: RefObject<HTMLDivElement>
  new_raw_cursor_pos: number
  new_value: string
  context_file_paths: string[]
}) => {
  setTimeout(() => {
    if (params.input_ref.current) {
      const display_pos = map_raw_pos_to_display_pos({
        raw_pos: params.new_raw_cursor_pos,
        raw_text: params.new_value,
        context_file_paths: params.context_file_paths
      })
      set_caret_position_for_div(params.input_ref.current, display_pos)
    }
  }, 0)
}
