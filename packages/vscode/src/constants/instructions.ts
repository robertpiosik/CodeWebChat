export const code_completion_instructions =
  'Find correct replacement for <missing text> symbol. Respond with replacement text in "replacement" XML tags, without explanations or any other text.'

export const chat_code_completion_instructions = (
  file_path: string,
  row: number,
  column: number
) =>
  `Find correct replacement text for the <missing text> symbol. Correctly formatted response begins with a code block containing the replacement text and then proceeds with explanation. In the code block place the following text as a first-line comment: "${file_path} ${
    row + 1
  }:${
    column + 1
  }". Always refer to symbol "<missing text>" as "cursor position" and "replacement" as "completion".`

export const refactoring_instruction =
  "User requested refactor of a file. Please show me the full code of the updated <file>, without explanations or any other text. I have a disability which means I can't type and need to be able to copy and paste the full code."
