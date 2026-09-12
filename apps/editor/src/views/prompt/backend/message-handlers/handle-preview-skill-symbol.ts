import * as vscode from 'vscode'
import { replace_skill_symbol } from '../utils/symbols/skill/replace-skill-symbol'
import { preview_text_in_temp_file } from '../utils/preview-text-in-temp-file'

export const handle_preview_skill_symbol = async (message: {
  agent: string
  repo: string
  skill_name: string
}) => {
  try {
    const instruction = `#Skill(${message.agent}:${message.repo}:${message.skill_name})`
    const { skill_definitions } = await replace_skill_symbol({
      instruction
    })

    if (skill_definitions) {
      await preview_text_in_temp_file({
        prefix: 'cwc-skill',
        content: skill_definitions.trim(),
        extension: '.md'
      })
    } else {
      vscode.window.showInformationMessage('Failed to generate skill preview.')
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to preview skill: ${error}`)
  }
}