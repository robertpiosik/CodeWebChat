export interface SubtaskDirective {
  instruction: string
  files: string[]
}

export const parse_subtask_directives = (response: string) => {
  const items: any[] = []

  const subtasks_match = response.match(/<subtasks>([\s\S]*?)<\/subtasks>/i)
  if (subtasks_match) {
    const subtasks_content = subtasks_match[1]
    const subtask_regex = /<subtask>([\s\S]*?)<\/subtask>/gi
    let subtask_match

    const subtasks: SubtaskDirective[] = []
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

    if (subtasks.length > 0) {
      items.push({
        type: 'subtasks',
        subtasks
      })
    }
  }

  return items
}
