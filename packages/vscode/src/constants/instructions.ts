export const code_completion_instructions =
  'Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.'

export const code_completion_instructions_for_panel = (
  file_path: string,
  row: number,
  column: number
) =>
  `Find correct replacement text for the <missing_text> symbol. Your response must begin with a Markdown Code Block containing the replacement text, followed by an explanation. The first line of the Markdown Code Block must be a commented-out text: "${file_path}" ${
    row + 1
  }:${
    column + 1
  }. Always refer to the symbol "<missing_text>" as "cursor position" and "replacement" as "completion".`

export const intelligent_update_instructions =
  "User requested refactor of a file. Print file in full because I have a disability which means I can't type and need to be able to just copy and paste."
