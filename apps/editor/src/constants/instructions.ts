export const code_at_cursor_instructions =
  'Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.\nExample:\n<replacement>!== undefined</replacement>'

export const code_at_cursor_instructions_for_prompt_view = (params: {
  file_path: string
  row: number
  column: number
}) => `# Output formatting

Your response must begin with a markdown heading identifying the file and the cursor position, followed by a markdown code block containing the replacement text, followed by a brief explanation. The heading must be: "### Code at cursor: \`${
  params.file_path
}\` (${params.row + 1}:${
  params.column + 1
})". Always refer to the symbol "<missing_text>" as "cursor position" and "replacement" as "completion". Example:

### Code at cursor: \`${params.file_path}\` (${params.row + 1}:${params.column + 1})

\`\`\`typescript
!== undefined
\`\`\`

The variable is possibly not defined.

---

Find correct replacement text for the <missing_text> symbol.`

export const intelligent_update_task_instructions =
  'Refactor the file according to the attached changes without explanations or any other text.'

export const intelligent_update_edit_format_instructions = `Print a markdown code block showing the original and updated code snippets with Git-style merge conflict syntax. Example:

\`\`\`python
<<<<<<< SEARCH
GREETING = "Welcome everyone!"
=======
WISHES = "Have a nice day!"
>>>>>>> REPLACE
<<<<<<< SEARCH
 def show_greeting():
   print(GREETING)
=======
 def show_wishes():
   print(WISHES)
>>>>>>> REPLACE
\`\`\``

export const intelligent_update_fallback_edit_format_instructions = `Print the updated file in FULL.`

export const commit_message_instructions =
  "Write a brief and precise summary for the changes, limited to a single sentence. Because the summary will be used for a commit message, don't use any markdown formatting and don't include a trailing dot. Use an imperative tone to ensure clarity and focus on the primary change or purpose."

export const find_relevant_files_instructions =
  'Find a complete set of files relevant to the following query. Include the primary files as well as any structural files.'

export const find_relevant_files_format = `# Output formatting

Your response must contain paths of relevant files enclosed in "relevant-files" and "file-path" XML tags. Don't send anything else. Example:

<relevant-files>
<file-path>src/index.ts</file-path>
<file-path>src/hello.ts</file-path>
<file-path>src/welcome.ts</file-path>
</relevant-files>`

export const find_relevant_files_format_for_prompt_view = `# Output formatting

Your response must begin with "**Relevant files:**", then list paths one under another, followed by a brief explanation. Example:

**Relevant files:**

- \`src/index.ts\`
- \`src/hello.ts\`
- \`src/welcome.ts\`

These files contain the core greeting logic and module exports.`

export const voice_input_instructions =
  'Respond with a transcription of the following audio recording or text "INAUDIBLE", and nothing else.'
