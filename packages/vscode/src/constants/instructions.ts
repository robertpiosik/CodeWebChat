export const code_completion_instructions =
  'Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.'

export const chat_code_completion_instructions = (
  file_path: string,
  row: number,
  column: number
) =>
  `Find correct replacement text for the <missing_text> symbol. Your response must begin with a code block containing the replacement text, followed by an explanation. The first line of the code block must be a comment containing: ${file_path} ${
    row + 1
  }:${
    column + 1
  }. Always refer to the symbol "<missing_text>" as "cursor position" and "replacement" as "completion".`

export const refactoring_instruction =
  "User requested refactor of a file. Please show me the full code of the updated <file>, without explanations or any other text. I have a disability which means I can't type and need to be able to copy and paste the full code."
