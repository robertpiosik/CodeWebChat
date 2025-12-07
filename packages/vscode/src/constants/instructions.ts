export const code_completion_instructions =
  'Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.\nExample:\n<replacement>!== undefined</replacement>\n'

export const code_completion_instructions_for_panel = (
  file_path: string,
  row: number,
  column: number
) =>
  `Find correct replacement text for the <missing_text> symbol.
<system>
Your response must begin with a markdown heading identifying the file and the cursor position, followed by a markdown code block containing the replacement text, followed by a brief explanation. The heading must be: "### Code completion: \`${file_path}\` (${
    row + 1
  }:${
    column + 1
  })". Always refer to the symbol "<missing_text>" as "cursor position" and "replacement" as "completion". Example:\n### Code completion: \`src/index.ts\` (25:5)
\`\`\`typescript
!== undefined
\`\`\`
The variable is possibly not defined.
</system>`

export const intelligent_update_instructions =
  "Refactor the file according to the attached changes without explanations or any other text. Print the file in full because I have a disability which means I can't type and need to be able to just copy and paste."

export const commit_message_instructions =
  "Write a brief and precise summary for the changes, limited to a single sentence, if possible and nothing else. Because the summary will be used for a commit message, don't use any markdown formatting. Use an imperative tone to ensure clarity and focus on the primary change or purpose."
