export const build_prompt = (params: {
  other_files?: string
  recent_files?: string
  context_text?: string
  active_file_context?: string
  skill_definitions?: string
  system_instructions?: string
  user_instructions?: string
  separator?: boolean
}): { part1: string; part2: string; full_prompt: string } => {
  let part1 = ''
  let part2 = ''
  let full_prompt = ''

  if (params.context_text !== undefined) {
    if (params.context_text) {
      full_prompt += `# Files\n\n${params.context_text}`
    }
    if (params.active_file_context) {
      full_prompt += params.active_file_context
    }
  } else {
    part1 = `# Files\n\n${params.other_files || ''}`
    part2 += `${params.recent_files || ''}${params.active_file_context || ''}`
    full_prompt = part1 + part2
  }

  if (params.skill_definitions) {
    part2 += params.skill_definitions
    full_prompt += params.skill_definitions
  }

  const has_system = !!params.system_instructions
  const has_user = !!params.user_instructions
  const separator = params.separator !== false && has_system && has_user

  if (params.system_instructions) {
    const sys = params.system_instructions.trimEnd()
    if (sys) {
      part2 += `${sys}\n`
      full_prompt += `${sys}\n`
      if (separator) {
        part2 += `\n---\n\n`
        full_prompt += `\n---\n\n`
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
