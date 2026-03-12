export interface SubtaskDirective {
  instruction: string
  files: string[]
}

export const parse_subtask_directives = (response: string) => {
  const items: any[] = []
  const subtasks: SubtaskDirective[] = []

  // 1. Try old XML format (for backward compatibility with history)
  const xml_subtasks_match = response.match(/<subtasks>([\s\S]*?)<\/subtasks>/i)
  if (xml_subtasks_match) {
    const subtasks_content = xml_subtasks_match[1]
    const subtask_regex = /<subtask>([\s\S]*?)<\/subtask>/gi
    let subtask_match

    while ((subtask_match = subtask_regex.exec(subtasks_content)) !== null) {
      const subtask_content = subtask_match[1]

      const instruction_match = subtask_content.match(
        /<instruction>([\s\S]*?)<\/instruction>/i
      )
      const instruction = instruction_match ? instruction_match[1].trim() : ''

      const commit_match = subtask_content.match(
        /<commit_message>([\s\S]*?)<\/commit_message>/i
      )
      const commit = commit_match ? commit_match[1].trim() : ''

      let final_instruction = instruction
      if (commit) {
        final_instruction += `\n\nCommit message: ${commit}`
      }

      const files_match = subtask_content.match(/<files>([\s\S]*?)<\/files>/i)
      const files: string[] = []
      if (files_match) {
        const file_regex = /<file>([\s\S]*?)<\/file>/gi
        let file_match
        while ((file_match = file_regex.exec(files_match[1])) !== null) {
          files.push(file_match[1].trim())
        }
      }

      if (final_instruction || files.length > 0) {
        subtasks.push({ instruction: final_instruction, files })
      }
    }
  } else {
    // 2. Try new Markdown format
    const md_subtasks_match = response.match(/\*\*Subtasks:\*\*([\s\S]+)/i)
    if (md_subtasks_match) {
      const content = md_subtasks_match[1]
      // Split safely by LLM generated headings (### Subtask 1, **Subtask 1**, or 1. **Instruction:**)
      const blocks = content.split(
        /(?:###\s*Subtask\s*\d+|\*\*Subtask\s*\d+\*\*|(?:\n|^)\d+\.\s*(?=\*\*Instruction:\*\*))/i
      )

      for (const block of blocks) {
        if (!block.trim()) continue

        const instruction_match = block.match(
          /\*\*Instruction:\*\*\s*([\s\S]*?)(?=\n\*\*Commit message:\*\*|\n\*\*Files:\*\*|$)/i
        )
        const commit_match = block.match(
          /\*\*Commit message:\*\*\s*([\s\S]*?)(?=\n\*\*Files:\*\*|$)/i
        )
        const files_match = block.match(/\*\*Files:\*\*([\s\S]*)/i)

        const instruction = instruction_match ? instruction_match[1].trim() : ''
        const commit = commit_match ? commit_match[1].trim() : ''

        let final_instruction = instruction
        if (commit) {
          final_instruction += `\n\nCommit message: ${commit}`
        }

        const files: string[] = []
        if (files_match) {
          // Extracts paths from standard markdown lists like: - `src/file.ts` or * src/file.ts
          const file_regex = /^[\s]*[-*]\s*`?([^`\n]+)`?/gm
          let file_match
          while ((file_match = file_regex.exec(files_match[1])) !== null) {
            const path = file_match[1].trim()
            if (path) files.push(path)
          }
        }

        if (final_instruction || files.length > 0) {
          subtasks.push({ instruction: final_instruction, files })
        }
      }
    }
  }

  if (subtasks.length > 0) {
    items.push({
      type: 'subtasks',
      subtasks
    })
  }

  return items
}
