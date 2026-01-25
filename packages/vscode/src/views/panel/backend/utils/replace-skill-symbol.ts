import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import {
  agents,
  discover_skills
} from '../message-handlers/handle-hash-sign-quick-pick/symbols/skill-symbol'

export const replace_skill_symbol = async (params: {
  instruction: string
}): Promise<{ instruction: string; skill_definitions: string }> => {
  const regex = /#Skill:([^:]+):([^:]+(?::[^:]+)?):([^\s,;:.!?]+)/g
  let skill_definitions = ''
  const processed_skills = new Set<string>()

  const instruction = params.instruction.replace(
    regex,
    (_, agent_name, _repo_id, skill_name) => {
      const key = `${agent_name}:${skill_name}`
      const reference = `<skill name="${skill_name}" />`

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

      let skill_content = `<skill name="${skill_name}">\n`

      try {
        const collect_files = (dir_path: string) => {
          const files = fs.readdirSync(dir_path)
          for (const file_name of files) {
            const file_path = path.join(dir_path, file_name)
            const stats = fs.statSync(file_path)

            if (stats.isDirectory()) {
              collect_files(file_path)
            } else if (stats.isFile()) {
              if (file_name.toLowerCase() == 'readme.md') continue
              const content = fs.readFileSync(file_path, 'utf-8')
              const relative_path = path
                .relative(skill.path, file_path)
                .replace(/\\/g, '/')
              skill_content += `<file path="${relative_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
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

      skill_content += `</skill>`
      skill_definitions += skill_content + '\n'

      return reference
    }
  )

  return { instruction, skill_definitions }
}
