import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import {
  agents,
  discover_skills
} from '../../../message-handlers/handle-hash-sign-quick-pick/symbols/skill-symbol'
import { normalize_path } from '@/utils/normalize-path'

export const replace_skill_symbol = async (params: {
  instruction: string
}): Promise<{ instruction: string; skill_definitions: string }> => {
  const regex = /#Skill\(([^:]+):([^:]+(?::[^:]+)?):([^)]+)\)/g
  let skill_definitions = ''
  const processed_skills = new Set<string>()

  const instruction = params.instruction.replace(
    regex,
    (_, agent_name, _repo_id, skill_name) => {
      const key = `${agent_name}:${skill_name}`

      const formatted_skill_name = skill_name
        .replace(/-/g, ' ')
        .replace(/^./, (c: string) => c.toUpperCase())

      const link_hash = formatted_skill_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const reference = `[${formatted_skill_name}](#${link_hash})`

      if (processed_skills.has(key)) {
        return reference
      }

      const agent = agents[agent_name]
      if (!agent) {
        Logger.warn({
          function_name: 'replace_skill_symbol',
          message: `Agent ${agent_name} not found`
        })
        return ''
      }

      const skills = discover_skills(agent.global_skills_dir)
      const skill = skills.find((s) => s.name == skill_name)

      if (!skill) {
        Logger.warn({
          function_name: 'replace_skill_symbol',
          message: `Skill ${skill_name} not found for agent ${agent_name}`
        })
        return ''
      }

      processed_skills.add(key)

      let skill_content = `# ${formatted_skill_name}\n\n`

      try {
        const collect_files = (dir_path: string) => {
          const files = fs.readdirSync(dir_path)
          for (const file_name of files) {
            const file_path = path.join(dir_path, file_name)
            const stats = fs.statSync(file_path)

            if (stats.isDirectory()) {
              collect_files(file_path)
            } else if (stats.isFile()) {
              const lower_name = file_name.toLowerCase()
              if (lower_name == 'readme.md' || lower_name.startsWith('license'))
                continue
              let content = fs.readFileSync(file_path, 'utf-8')

              content = content.replace(
                /^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/,
                ''
              )

              const relative_path = normalize_path(
                path.relative(skill.path, file_path)
              )
              const backticks = content.includes('```') ? '````' : '```'
              skill_content += `- File: \`${relative_path.replace(
                /\\/g,
                '/'
              )}\`\n\n${backticks}\n${content}\n${backticks}\n\n`
            }
          }
        }
        collect_files(skill.path)
      } catch (e) {
        Logger.error({
          function_name: 'replace_skill_symbol',
          message: `Error reading files for skill ${skill_name}`,
          data: e
        })
        return ''
      }

      skill_definitions += skill_content

      return reference
    }
  )

  return { instruction, skill_definitions }
}
