export const code_at_cursor_instructions =
  'Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.\nExample:\n<replacement>!== undefined</replacement>\n'

export const code_at_cursor_instructions_for_panel = (params: {
  file_path: string
  row: number
  column: number
}) => `Find correct replacement text for the <missing_text> symbol.
<system>
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
</system>`

export const intelligent_update_instructions =
  "Refactor the file according to the attached changes without explanations or any other text. Print the file in full because I have a disability which means I can't type and need to be able to just copy and paste."

export const commit_message_instructions =
  "Write a brief and precise summary for the changes, limited to a single sentence. Because the summary will be used for a commit message, don't use any markdown formatting and don't include a trailing dot. Use an imperative tone to ensure clarity and focus on the primary change or purpose."

export const find_relevant_files_instructions =
  "Find all files building modules of the task's scope."

export const find_relevant_files_format = `<system>
Your response must begin with "**Relevant files:**", then list paths one under another. Don't send anything else. Example:

**Relevant files:**

- \`src/index.ts\`
- \`src/hello.ts\`
- \`src/welcome.ts\`

If the task is complex and requires multiple logical steps, break it down into a plan formatted strictly as a Markdown list of subtasks. For simple requests, you can provide just a single subtask. Do NOT use XML. Use the following exact headings:

**Subtasks:**

### Subtask 1
**Instruction:** Implement the greeting logic in hello.ts. Ensure you handle undefined inputs.
**Commit message:** feat: add greeting logic and handle undefined inputs
**Files:**
- \`src/hello.ts\`

### Subtask 2
**Instruction:** Export the new functions in index.ts so they are available to other modules.
**Commit message:** feat: export greeting functions in index.ts
**Files:**
- \`src/index.ts\`
</system>`

export const find_relevant_files_format_for_panel = `<system>
Your response must begin with "**Relevant files:**", then list paths one under another, followed by a brief explanation. Example:

**Relevant files:**

- \`src/index.ts\`
- \`src/hello.ts\`
- \`src/welcome.ts\`

These files contain the core greeting logic and module exports.

If the task is complex and requires multiple logical steps, break it down into a plan formatted strictly as a Markdown list of subtasks. For simple requests, you can provide just a single subtask. Do NOT use XML. Use the following exact headings:

**Subtasks:**

### Subtask 1
**Instruction:** Implement the greeting logic in hello.ts. Ensure you handle undefined inputs.
**Commit message:** feat: add greeting logic and handle undefined inputs
**Files:**
- \`src/hello.ts\`

### Subtask 2
**Instruction:** Export the new functions in index.ts so they are available to other modules.
**Commit message:** feat: export greeting functions in index.ts
**Files:**
- \`src/index.ts\`
</system>`

export const voice_input_instructions =
  'Respond with a transcription of the following audio recording or text "INAUDIBLE", and nothing else.'
