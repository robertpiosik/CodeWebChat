export const insert_text_at_caret = (
  original_text: string,
  text_to_insert: string,
  caret_pos: number,
  chars_to_remove: number = 0
): { new_text: string; new_caret_position: number } => {
  const before_caret = original_text.slice(0, caret_pos - chars_to_remove)
  const after_caret = original_text.slice(caret_pos)

  const new_text = (before_caret + text_to_insert + after_caret).replace(
    /  +/g,
    ' '
  )
  const new_caret_position = (before_caret + text_to_insert).replace(
    /  +/g,
    ' '
  ).length

  return { new_text, new_caret_position }
}
