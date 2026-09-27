export const code_at_cursor_instructions =
  'Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.\nExample:\n<replacement>!== undefined</replacement>'

export const code_at_cursor_instructions_for_chatbots = (params: {
  file_path: string
  row: number
  column: number
}) => `Your response must begin with a markdown heading identifying the file and the cursor position, followed by a markdown code block containing the replacement text, followed by a brief explanation. The heading must be: "### Code at cursor: \`${
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

export const patch_repair_task_instructions =
  'Apply the attached changes to the file without explanations or any other text.'

export const patch_repair_format_instructions = `Your response must begin with a markdown heading identifying the file, followed by a markdown code block containing the updated file. The heading must be: "### Patch repair: \`path/to/file.ext\`". Example:

### Patched file: \`path/to/file.ext\`

\`\`\`python
def add(a, b):
  return a + b

def subtract(a, b):
  return a - b
\`\`\``

export const commit_message_format = `Your response must begin with "**Commit message:**", then proceed with the message. Example:

**Commit message:** Bump version to 1.0.1`

export const ai_file_search_format_instructions = `Output strictly as a bulleted list of file paths without explanations or any other text. Example:
  
- \`src/index.ts\`
- \`src/greetings/hello.ts\`
- \`src/greetings/welcome.ts\``

export const intelligent_file_search_format_for_prompt_view = (
  metadata?: string,
  folder_path?: string
) => {
  const prefix = folder_path && folder_path != '.' ? `${folder_path}/` : ''
  return `Your response must begin with "**Intelligent file search results${
    metadata || ''
  }:**", then a bulleted list of file paths, followed by a brief explanation. Example:

**Intelligent file search results${metadata || ''}:**

- \`${prefix || 'src/'}index.ts\`
- \`${prefix || 'src/'}greetings/hello.ts\`
- \`${prefix || 'src/'}greetings/welcome.ts\`

These files contain the core greeting logic and module exports.`
}

export const voice_input_instructions =
  'Respond with a transcription of the following audio recording or text "INAUDIBLE", and nothing else.'

export const cli_edit_ask_requirements = {
  preloaded_files: 'All project files are shown in [files](#files) section.',
  referenced_files_with_some_preloaded:
    'Begin by looking at [files](#files) section for unread files (### Unread file: `[PROJECT-RELATIVE PATH]`) and read them one-by-one.',
  referenced_files_only:
    'Begin by looking at [files](#files) section for referenced files (### File: `[PROJECT-RELATIVE PATH]`) and read them one-by-one.',
  read_images: 'If [task](#task) section includes *.png image paths, read them.',
  restrict_tool_calls:
    'Further tool calling (e.g. running commands like ls, git, etc.) is forbidden, with exceptions: explicit file CREATION, DELETION or UPDATES to complete the [task](#task).'
}
