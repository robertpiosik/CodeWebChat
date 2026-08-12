import { normalize_path } from './normalize-path'

export namespace PromptBuilder {
  export const build_file_context = (params: {
    filepath: string
    content?: string
    is_binary?: boolean
  }): string => {
    const display_path = normalize_path(params.filepath)
    if (params.is_binary || params.content === undefined) {
      return `- File: \`${display_path}\`\n\nBinary file\n\n`
    }
    const backticks = params.content.includes('```') ? '````' : '```'
    return `- File: \`${display_path}\`\n\n${backticks}\n${params.content}\n${backticks}\n\n`
  }

  export const build_diff_file_context = (params: {
    status: 'created' | 'deleted' | 'renamed' | 'updated'
    filepath: string
    old_filepath?: string
    diff_content?: string
    full_content?: string
  }): string => {
    let result = ''
    const display_path = normalize_path(params.filepath)

    if (params.status == 'created') {
      result += `- New file: \`${display_path}\`\n\n`
    } else if (params.status == 'deleted') {
      result += `- Deleted file: \`${display_path}\`\n\n`
    } else if (params.status == 'renamed' && params.old_filepath) {
      const old_display_path = normalize_path(params.old_filepath)
      result += `- Renamed file: \`${old_display_path}\` (old) \`${display_path}\` (new)\n\n`
    } else {
      result += `- Updated file: \`${display_path}\`\n\n`
    }

    if (params.diff_content?.trimEnd()) {
      const diff_content = params.diff_content.trimEnd()
      const backticks = diff_content.includes('```') ? '````' : '```'
      result += `${backticks}diff\n${diff_content}\n${backticks}\n\n`
    }

    if (params.full_content?.trimEnd()) {
      const full_content = params.full_content.trimEnd()
      const backticks = full_content.includes('```') ? '````' : '```'
      result += `${backticks}\n${full_content}\n${backticks}\n\n`
    }

    return result
  }

  export const build_prompt = (params: {
    other_files?: string
    recent_files?: string
    context_text?: string
    active_file?: { filepath: string; content: string }
    skill_definitions?: string
    system_instructions?: string
    user_instructions?: string
    separator?: boolean
  }): { part1: string; part2: string; full_prompt: string } => {
    let part1 = ''
    let part2 = ''
    let full_prompt = ''

    let active_file_context = ''
    if (params.active_file) {
      active_file_context = build_file_context(params.active_file)
    }

    if (params.context_text !== undefined) {
      if (params.context_text) {
        full_prompt += `# Files\n\n${params.context_text}`
      }
      if (active_file_context) {
        full_prompt += active_file_context
      }
    } else {
      part1 = `# Files\n\n${params.other_files || ''}`
      part2 += `${params.recent_files || ''}${active_file_context}`
      full_prompt = part1 + part2
    }

    if (params.skill_definitions) {
      part2 += params.skill_definitions
      full_prompt += params.skill_definitions
    }

    const has_system = !!params.system_instructions
    const separator = params.separator !== false && has_system

    if (params.system_instructions) {
      const sys = params.system_instructions.trimEnd()
      if (sys) {
        part2 += `${sys}\n`
        full_prompt += `${sys}\n`
        if (separator) {
          part2 += `\n---\n`
          full_prompt += `\n---\n\n`
          if (params.user_instructions) {
            part2 += `\n`
          }
        } else {
          part2 += `\n\n`
          full_prompt += `\n\n`
        }
      }
    }

    if (params.user_instructions) {
      part2 += params.user_instructions
      full_prompt += params.user_instructions
    }

    return { part1, part2, full_prompt }
  }
}
